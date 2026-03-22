/**
 * Google Drive sync module — client-side only, no backend.
 * Uses Google Identity Services (GIS) for OAuth 2.0 implicit flow
 * and Drive API v3 REST with fetch for file operations.
 */

import { saveConfig, loadConfig, deleteConfig, type BackupMeta } from './storage';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const SYNC_META_KEY = 'gdriveSyncMeta';
const REMOTE_BACKUP_NAME = 'source-of-truth.jwlibrary';
const REMOTE_META_NAME = 'sync-meta.json';

// ── Types ────────────────────────────────────────────────

export interface SyncMeta {
	remoteFileId: string | null;
	remoteMetaFileId: string | null;
	lastSyncedAt: string | null;
	localBackupMeta: BackupMeta | null;
}

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';

export interface RemoteStatus {
	hasRemote: boolean;
	remoteModifiedAt: string | null;
	needsDownload: boolean;
	needsUpload: boolean;
	hasConflict: boolean;
}

// ── Token management ─────────────────────────────────────

let accessToken: string | null = null;
let tokenExpiresAt = 0;

function isTokenValid(): boolean {
	return !!accessToken && Date.now() < tokenExpiresAt;
}

export function getAccessToken(): string | null {
	return isTokenValid() ? accessToken : null;
}

function getClientId(): string {
	// SvelteKit exposes PUBLIC_ env vars at build time via import.meta.env
	try {
		return (import.meta.env as Record<string, string>)['PUBLIC_GOOGLE_CLIENT_ID'] ?? '';
	} catch {
		return '';
	}
}

function isGisLoaded(): boolean {
	return typeof google !== 'undefined' && !!google?.accounts?.oauth2;
}

export function signIn(): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!isGisLoaded()) {
			reject(new Error('Google Identity Services not loaded'));
			return;
		}
		const clientId = getClientId();
		if (!clientId) {
			reject(new Error('Google Client ID not configured'));
			return;
		}
		const client = google.accounts.oauth2.initTokenClient({
			client_id: clientId,
			scope: SCOPE,
			callback: (response) => {
				if (response.error) {
					reject(new Error(response.error_description ?? response.error));
					return;
				}
				accessToken = response.access_token;
				tokenExpiresAt = Date.now() + response.expires_in * 1000;
				resolve(response.access_token);
			},
			error_callback: (error) => {
				reject(new Error(error.message));
			},
		});
		client.requestAccessToken();
	});
}

export function trySilentAuth(): Promise<boolean> {
	return new Promise((resolve) => {
		if (!isGisLoaded() || !getClientId()) {
			resolve(false);
			return;
		}
		const client = google.accounts.oauth2.initTokenClient({
			client_id: getClientId(),
			scope: SCOPE,
			callback: (response) => {
				if (response.error) {
					resolve(false);
					return;
				}
				accessToken = response.access_token;
				tokenExpiresAt = Date.now() + response.expires_in * 1000;
				resolve(true);
			},
			error_callback: () => resolve(false),
		});
		client.requestAccessToken({ prompt: '' });
	});
}

export function signOut(): Promise<void> {
	return new Promise<void>((resolve) => {
		if (accessToken && isGisLoaded()) {
			google.accounts.oauth2.revoke(accessToken, () => resolve());
		} else {
			resolve();
		}
		accessToken = null;
		tokenExpiresAt = 0;
	});
}

// ── Drive API helpers ────────────────────────────────────

async function ensureToken(): Promise<string> {
	if (isTokenValid()) return accessToken!;
	const ok = await trySilentAuth();
	if (ok && accessToken) return accessToken;
	throw new Error('Not authenticated');
}

async function driveGet(path: string, params?: Record<string, string>): Promise<Response> {
	const token = await ensureToken();
	const url = new URL(`${DRIVE_API}${path}`);
	if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	const res = await fetch(url.toString(), {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
	return res;
}

interface DriveFile {
	id: string;
	name: string;
	modifiedTime: string;
}

async function listAppDataFiles(): Promise<DriveFile[]> {
	const res = await driveGet('/files', {
		spaces: 'appDataFolder',
		fields: 'files(id,name,modifiedTime)',
		pageSize: '20',
	});
	const data = await res.json();
	return data.files ?? [];
}

async function uploadFile(
	name: string,
	bytes: Uint8Array,
	mimeType: string,
	existingId?: string,
): Promise<string> {
	const token = await ensureToken();
	const metadata = existingId
		? { name }
		: { name, parents: ['appDataFolder'] };

	const boundary = '---jwnotessync' + Date.now();
	const metaJson = JSON.stringify(metadata);

	const encoder = new TextEncoder();
	const parts = [
		encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaJson}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`),
		bytes,
		encoder.encode(`\r\n--${boundary}--`),
	];

	const body = new Uint8Array(parts.reduce((s, p) => s + p.byteLength, 0));
	let offset = 0;
	for (const part of parts) {
		body.set(part, offset);
		offset += part.byteLength;
	}

	const url = existingId
		? `${UPLOAD_API}/files/${existingId}?uploadType=multipart`
		: `${UPLOAD_API}/files?uploadType=multipart`;

	const method = existingId ? 'PATCH' : 'POST';

	const res = await fetch(url, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': `multipart/related; boundary=${boundary}`,
		},
		body,
	});

	if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
	const data = await res.json();
	return data.id;
}

async function downloadFile(fileId: string): Promise<Uint8Array> {
	const token = await ensureToken();
	const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok) throw new Error(`Download failed: ${res.status}`);
	return new Uint8Array(await res.arrayBuffer());
}

// ── Sync metadata persistence ────────────────────────────

export async function loadSyncMeta(): Promise<SyncMeta | null> {
	return loadConfig<SyncMeta>(SYNC_META_KEY);
}

export async function saveSyncMeta(meta: SyncMeta): Promise<void> {
	await saveConfig(SYNC_META_KEY, meta);
}

export async function clearSyncMeta(): Promise<void> {
	await deleteConfig(SYNC_META_KEY);
}

// ── High-level sync operations ───────────────────────────

export async function uploadSourceOfTruth(
	backupMeta: BackupMeta,
	bytes: Uint8Array,
): Promise<void> {
	const syncMeta = (await loadSyncMeta()) ?? {
		remoteFileId: null,
		remoteMetaFileId: null,
		lastSyncedAt: null,
		localBackupMeta: null,
	};

	// Upload the backup file
	const fileId = await uploadFile(
		REMOTE_BACKUP_NAME,
		bytes,
		'application/zip',
		syncMeta.remoteFileId ?? undefined,
	);

	// Upload the metadata sidecar
	const metaJson = JSON.stringify(backupMeta);
	const metaBytes = new TextEncoder().encode(metaJson);
	const metaFileId = await uploadFile(
		REMOTE_META_NAME,
		metaBytes,
		'application/json',
		syncMeta.remoteMetaFileId ?? undefined,
	);

	// Update sync metadata
	await saveSyncMeta({
		remoteFileId: fileId,
		remoteMetaFileId: metaFileId,
		lastSyncedAt: new Date().toISOString(),
		localBackupMeta: backupMeta,
	});
}

export async function checkRemoteStatus(localTruth: BackupMeta | null): Promise<RemoteStatus> {
	const files = await listAppDataFiles();
	const remoteBackup = files.find((f) => f.name === REMOTE_BACKUP_NAME);

	if (!remoteBackup) {
		return {
			hasRemote: false,
			remoteModifiedAt: null,
			needsDownload: false,
			needsUpload: !!localTruth,
			hasConflict: false,
		};
	}

	const syncMeta = await loadSyncMeta();
	const lastSynced = syncMeta?.lastSyncedAt;

	const remoteIsNewer = !lastSynced || remoteBackup.modifiedTime > lastSynced;
	const localIsNewer = localTruth && lastSynced && localTruth.storedAt > lastSynced;

	return {
		hasRemote: true,
		remoteModifiedAt: remoteBackup.modifiedTime,
		needsDownload: remoteIsNewer && !localIsNewer,
		needsUpload: !!localIsNewer && !remoteIsNewer,
		hasConflict: !!(remoteIsNewer && localIsNewer),
	};
}

export async function downloadFromDrive(): Promise<{ bytes: Uint8Array; meta: BackupMeta } | null> {
	const files = await listAppDataFiles();
	const remoteBackup = files.find((f) => f.name === REMOTE_BACKUP_NAME);
	const remoteMeta = files.find((f) => f.name === REMOTE_META_NAME);

	if (!remoteBackup) return null;

	const bytes = await downloadFile(remoteBackup.id);

	let meta: BackupMeta | null = null;
	if (remoteMeta) {
		try {
			const metaBytes = await downloadFile(remoteMeta.id);
			meta = JSON.parse(new TextDecoder().decode(metaBytes));
		} catch { /* ignore bad metadata */ }
	}

	if (!meta) {
		// Fallback: construct basic metadata
		meta = {
			id: crypto.randomUUID(),
			fileName: REMOTE_BACKUP_NAME,
			deviceName: 'Cloud Backup',
			date: new Date().toISOString(),
			stats: { notes: 0, highlights: 0, bookmarks: 0, tags: 0 },
			storedAt: new Date().toISOString(),
			sizeBytes: bytes.byteLength,
			isMerged: true,
			parentIds: [],
			isSourceOfTruth: true,
		};
	}

	// Update sync meta with remote file IDs
	await saveSyncMeta({
		remoteFileId: remoteBackup.id,
		remoteMetaFileId: remoteMeta?.id ?? null,
		lastSyncedAt: new Date().toISOString(),
		localBackupMeta: meta,
	});

	return { bytes, meta };
}
