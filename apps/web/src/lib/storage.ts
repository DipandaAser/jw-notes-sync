/**
 * Local persistence layer: OPFS for raw backup bytes, IndexedDB for metadata.
 * Falls back to IndexedDB-only when OPFS is unavailable.
 */

const DB_NAME = 'jw-notes-sync';
const DB_VERSION = 1;
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
}

// ── IndexedDB helpers ────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(META_STORE)) {
				db.createObjectStore(META_STORE, { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains(BLOB_STORE)) {
				db.createObjectStore(BLOB_STORE);
			}
			if (!db.objectStoreNames.contains(CONFIG_STORE)) {
				db.createObjectStore(CONFIG_STORE);
			}
		};
		req.onsuccess = () => resolve(req.result);
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
	meta: Omit<BackupMeta, 'storedAt' | 'sizeBytes'>,
): Promise<void> {
	const db = await openDB();
	const fullMeta: BackupMeta = {
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
	db.close();
}

/** Load raw backup bytes by id. Checks OPFS first, then IDB. */
export async function loadBackupBytes(id: string): Promise<Uint8Array | null> {
	// Try OPFS
	const opfsData = await opfsRead(`backup-${id}.jwlibrary`);
	if (opfsData) return opfsData;

	// Fallback to IDB
	const db = await openDB();
	const data = await idbGet<Uint8Array>(db, BLOB_STORE, id);
	db.close();
	return data ?? null;
}

/** Get all stored backup metadata, sorted by most recent. */
export async function listBackupMetas(): Promise<BackupMeta[]> {
	const db = await openDB();
	const metas = await idbGetAll<BackupMeta>(db, META_STORE);
	db.close();
	return metas.sort((a, b) => b.storedAt.localeCompare(a.storedAt));
}

/** Delete a backup from both OPFS and IDB. */
export async function deleteBackup(id: string): Promise<void> {
	await opfsDelete(`backup-${id}.jwlibrary`);
	const db = await openDB();
	await idbDelete(db, META_STORE, id);
	await idbDelete(db, BLOB_STORE, id);
	db.close();
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
	db.close();
}

/** Save merge config to IDB. */
export async function saveMergeConfig(config: unknown): Promise<void> {
	const db = await openDB();
	await idbPut(db, CONFIG_STORE, config, 'mergeConfig');
	db.close();
}

/** Load merge config from IDB. */
export async function loadMergeConfig(): Promise<unknown | null> {
	const db = await openDB();
	const config = await idbGet(db, CONFIG_STORE, 'mergeConfig');
	db.close();
	return config ?? null;
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
