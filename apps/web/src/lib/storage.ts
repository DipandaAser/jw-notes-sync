/**
 * Local persistence layer: OPFS for raw backup bytes, IndexedDB for metadata.
 * Falls back to IndexedDB-only when OPFS is unavailable.
 */

const DB_NAME = 'jw-notes-sync';
const DB_VERSION = 2;
const META_STORE = 'backup-meta';
const BLOB_STORE = 'backup-blobs';
const CONFIG_STORE = 'config';

export interface BackupMeta {
	id: string;
	fileName: string;
	deviceName: string;
	date: string;
	stats: { notes: number; highlights: number; bookmarks: number; tags: number };
	storedAt: string; // ISO timestamp
	sizeBytes: number;
	isMerged: boolean;
	parentIds: string[];
	isSourceOfTruth: boolean;
}

// ── IndexedDB helpers ────────────────────────────────────

let cachedDB: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
	if (cachedDB) return Promise.resolve(cachedDB);
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = (event) => {
			const db = req.result;
			const oldVersion = event.oldVersion;
			if (!db.objectStoreNames.contains(META_STORE)) {
				db.createObjectStore(META_STORE, { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains(BLOB_STORE)) {
				db.createObjectStore(BLOB_STORE);
			}
			if (!db.objectStoreNames.contains(CONFIG_STORE)) {
				db.createObjectStore(CONFIG_STORE);
			}
			// v1→v2: backfill new fields on existing metas
			if (oldVersion < 2 && req.transaction) {
				const store = req.transaction.objectStore(META_STORE);
				const cursor = store.openCursor();
				cursor.onsuccess = () => {
					const c = cursor.result;
					if (c) {
						const meta = c.value as Record<string, unknown>;
						if (meta.isMerged === undefined) {
							meta.isMerged = false;
							meta.parentIds = [];
							meta.isSourceOfTruth = false;
							c.update(meta);
						}
						c.continue();
					}
				};
			}
		};
		req.onsuccess = () => {
			cachedDB = req.result;
			cachedDB.onclose = () => { cachedDB = null; };
			resolve(cachedDB);
		};
		req.onerror = () => reject(req.error);
	});
}

function idbGet<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(store, 'readonly');
		const req = tx.objectStore(store).get(key);
		req.onsuccess = () => resolve(req.result as T | undefined);
		req.onerror = () => reject(req.error);
	});
}

function idbPut(db: IDBDatabase, store: string, value: unknown, key?: IDBValidKey): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(store, 'readwrite');
		const req = key !== undefined
			? tx.objectStore(store).put(value, key)
			: tx.objectStore(store).put(value);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

function idbDelete(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(store, 'readwrite');
		const req = tx.objectStore(store).delete(key);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(store, 'readonly');
		const req = tx.objectStore(store).getAll();
		req.onsuccess = () => resolve(req.result as T[]);
		req.onerror = () => reject(req.error);
	});
}

function idbClear(db: IDBDatabase, store: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(store, 'readwrite');
		const req = tx.objectStore(store).clear();
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

// ── OPFS helpers ─────────────────────────────────────────

let opfsRoot: FileSystemDirectoryHandle | null = null;

async function getOPFSRoot(): Promise<FileSystemDirectoryHandle | null> {
	if (opfsRoot) return opfsRoot;
	try {
		opfsRoot = await navigator.storage.getDirectory();
		return opfsRoot;
	} catch {
		return null;
	}
}

async function opfsWrite(name: string, data: Uint8Array): Promise<boolean> {
	const root = await getOPFSRoot();
	if (!root) return false;
	try {
		const file = await root.getFileHandle(name, { create: true });
		const writable = await file.createWritable();
		await writable.write(data as unknown as FileSystemWriteChunkType);
		await writable.close();
		return true;
	} catch {
		return false;
	}
}

async function opfsRead(name: string): Promise<Uint8Array | null> {
	const root = await getOPFSRoot();
	if (!root) return null;
	try {
		const file = await root.getFileHandle(name);
		const blob = await file.getFile();
		return new Uint8Array(await blob.arrayBuffer());
	} catch {
		return null;
	}
}

async function opfsDelete(name: string): Promise<void> {
	const root = await getOPFSRoot();
	if (!root) return;
	try {
		await root.removeEntry(name);
	} catch {
		// file may not exist
	}
}

// ── Public API ───────────────────────────────────────────

/** Save raw backup bytes + metadata. Tries OPFS first, falls back to IDB blob store. */
export async function saveBackup(
	id: string,
	rawBytes: Uint8Array,
	meta: Omit<BackupMeta, 'storedAt' | 'sizeBytes' | 'isMerged' | 'parentIds' | 'isSourceOfTruth'> & Partial<Pick<BackupMeta, 'isMerged' | 'parentIds' | 'isSourceOfTruth'>>,
): Promise<void> {
	const db = await openDB();
	const fullMeta: BackupMeta = {
		isMerged: false,
		parentIds: [],
		isSourceOfTruth: false,
		...meta,
		storedAt: new Date().toISOString(),
		sizeBytes: rawBytes.byteLength,
	};

	// Try OPFS first
	const opfsOk = await opfsWrite(`backup-${id}.jwlibrary`, rawBytes);
	if (!opfsOk) {
		// Fallback: store bytes in IndexedDB
		await idbPut(db, BLOB_STORE, rawBytes, id);
	}

	// Always store metadata in IDB
	await idbPut(db, META_STORE, fullMeta);

}

/** Load raw backup bytes by id. Checks OPFS first, then IDB. */
export async function loadBackupBytes(id: string): Promise<Uint8Array | null> {
	// Try OPFS
	const opfsData = await opfsRead(`backup-${id}.jwlibrary`);
	if (opfsData) return opfsData;

	// Fallback to IDB
	const db = await openDB();
	const data = await idbGet<Uint8Array>(db, BLOB_STORE, id);

	return data ?? null;
}

/** Get all stored backup metadata, sorted by most recent. */
export async function listBackupMetas(): Promise<BackupMeta[]> {
	const db = await openDB();
	const metas = await idbGetAll<BackupMeta>(db, META_STORE);

	return metas.sort((a, b) => b.storedAt.localeCompare(a.storedAt));
}

/** Delete a backup from both OPFS and IDB. Rejects merged files. */
export async function deleteBackup(id: string): Promise<void> {
	const db = await openDB();
	const meta = await idbGet<BackupMeta>(db, META_STORE, id);
	if (meta?.isMerged) {
		throw new Error('Cannot delete a merged backup');
	}
	await opfsDelete(`backup-${id}.jwlibrary`);
	await idbDelete(db, META_STORE, id);
	await idbDelete(db, BLOB_STORE, id);
}

/** Get the current source of truth (latest merged file). */
export async function getSourceOfTruth(): Promise<BackupMeta | null> {
	const metas = await listBackupMetas();
	return metas.find((m) => m.isSourceOfTruth) ?? null;
}

/** Save a merged backup as the new source of truth. Clears the flag on the old truth. */
export async function saveMergedBackup(
	id: string,
	rawBytes: Uint8Array,
	meta: Omit<BackupMeta, 'storedAt' | 'sizeBytes' | 'isMerged' | 'isSourceOfTruth'>,
): Promise<void> {
	const db = await openDB();

	// Clear old source of truth
	const allMetas = await idbGetAll<BackupMeta>(db, META_STORE);
	for (const m of allMetas) {
		if (m.isSourceOfTruth) {
			m.isSourceOfTruth = false;
			await idbPut(db, META_STORE, m);
		}
	}

	// Save new merged file as truth
	await saveBackup(id, rawBytes, {
		...meta,
		isMerged: true,
		isSourceOfTruth: true,
	});
}

/** Delete all stored backups. */
export async function clearAllBackups(): Promise<void> {
	// Clear OPFS files
	const metas = await listBackupMetas();
	for (const meta of metas) {
		await opfsDelete(`backup-${meta.id}.jwlibrary`);
	}
	// Clear IDB stores
	const db = await openDB();
	await idbClear(db, META_STORE);
	await idbClear(db, BLOB_STORE);

}

/** Save merge config to IDB. */
export async function saveMergeConfig(config: unknown): Promise<void> {
	const db = await openDB();
	await idbPut(db, CONFIG_STORE, config, 'mergeConfig');

}

/** Load merge config from IDB. */
export async function loadMergeConfig(): Promise<unknown | null> {
	const db = await openDB();
	const config = await idbGet(db, CONFIG_STORE, 'mergeConfig');

	return config ?? null;
}

/** Generic config get/set for any key in the config store. */
export async function saveConfig(key: string, value: unknown): Promise<void> {
	const db = await openDB();
	await idbPut(db, CONFIG_STORE, value, key);
}

export async function loadConfig<T>(key: string): Promise<T | null> {
	const db = await openDB();
	const val = await idbGet<T>(db, CONFIG_STORE, key);
	return val ?? null;
}

export async function deleteConfig(key: string): Promise<void> {
	const db = await openDB();
	await idbDelete(db, CONFIG_STORE, key);
}

/** Estimate total storage used by backups (bytes). */
export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
	try {
		const estimate = await navigator.storage.estimate();
		return {
			used: estimate.usage ?? 0,
			quota: estimate.quota ?? 0,
		};
	} catch {
		return { used: 0, quota: 0 };
	}
}
