/**
 * Local persistence for mobile: expo-file-system for backup bytes, AsyncStorage for metadata.
 */

import { File, Paths, Directory } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const META_KEY = 'jw-notes-sync-backup-metas';
const BACKUPS_DIR_NAME = 'backups';

export interface BackupMeta {
  id: string;
  fileName: string;
  deviceName: string;
  date: string;
  stats: { notes: number; highlights: number; bookmarks: number; tags: number };
  storedAt: string;
  sizeBytes: number;
  isMerged: boolean;
  parentIds: string[];
  isSourceOfTruth: boolean;
}

// ── File helpers ─────────────────────────────────────────

function getBackupsDir(): Directory {
  return new Directory(Paths.document, BACKUPS_DIR_NAME);
}

function ensureBackupsDir(): void {
  const dir = getBackupsDir();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
}

function getBackupFile(id: string): File {
  return new File(getBackupsDir(), `${id}.jwlibrary`);
}

// ── Metadata helpers ─────────────────────────────────────

async function loadAllMetas(): Promise<BackupMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return [];
    const metas: BackupMeta[] = JSON.parse(raw);
    // Backfill new fields for old entries
    return metas.map((m) => ({
      ...m,
      isMerged: m.isMerged ?? false,
      parentIds: m.parentIds ?? [],
      isSourceOfTruth: m.isSourceOfTruth ?? false,
    }));
  } catch {
    return [];
  }
}

async function saveAllMetas(metas: BackupMeta[]): Promise<void> {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(metas));
}

// ── Public API ───────────────────────────────────────────

/** Save raw backup bytes + metadata. */
export async function saveBackup(
  id: string,
  rawBytes: Uint8Array,
  meta: Omit<BackupMeta, 'storedAt' | 'sizeBytes' | 'isMerged' | 'parentIds' | 'isSourceOfTruth'> &
    Partial<Pick<BackupMeta, 'isMerged' | 'parentIds' | 'isSourceOfTruth'>>,
): Promise<void> {
  ensureBackupsDir();
  const file = getBackupFile(id);
  file.write(rawBytes);

  const fullMeta: BackupMeta = {
    isMerged: false,
    parentIds: [],
    isSourceOfTruth: false,
    ...meta,
    storedAt: new Date().toISOString(),
    sizeBytes: rawBytes.byteLength,
  };

  const metas = await loadAllMetas();
  metas.push(fullMeta);
  await saveAllMetas(metas);
}

/** Load raw backup bytes by id. */
export async function loadBackupBytes(id: string): Promise<Uint8Array | null> {
  try {
    const file = getBackupFile(id);
    if (!file.exists) return null;
    return await file.bytes();
  } catch {
    return null;
  }
}

/** Get all stored backup metadata, sorted by most recent. */
export async function listBackupMetas(): Promise<BackupMeta[]> {
  const metas = await loadAllMetas();
  return metas.sort((a, b) => b.storedAt.localeCompare(a.storedAt));
}

/** Delete a backup. Rejects merged files. */
export async function deleteBackup(id: string): Promise<void> {
  const metas = await loadAllMetas();
  const meta = metas.find((m) => m.id === id);
  if (meta?.isMerged) {
    throw new Error('Cannot delete a merged backup');
  }
  try {
    const file = getBackupFile(id);
    if (file.exists) file.delete();
  } catch { /* file may not exist */ }
  await saveAllMetas(metas.filter((m) => m.id !== id));
}

/** Get the current source of truth. */
export async function getSourceOfTruth(): Promise<BackupMeta | null> {
  const metas = await loadAllMetas();
  return metas.find((m) => m.isSourceOfTruth) ?? null;
}

/** Save a merged backup as the new source of truth. */
export async function saveMergedBackup(
  id: string,
  rawBytes: Uint8Array,
  meta: Omit<BackupMeta, 'storedAt' | 'sizeBytes' | 'isMerged' | 'isSourceOfTruth'>,
): Promise<void> {
  // Clear old truth
  const metas = await loadAllMetas();
  for (const m of metas) {
    if (m.isSourceOfTruth) m.isSourceOfTruth = false;
  }
  await saveAllMetas(metas);

  // Save new merged file as truth
  await saveBackup(id, rawBytes, {
    ...meta,
    isMerged: true,
    isSourceOfTruth: true,
  });
}

/** Delete all stored backups. */
export async function clearAllBackups(): Promise<void> {
  try {
    const dir = getBackupsDir();
    if (dir.exists) dir.delete();
  } catch { /* ignore */ }
  await AsyncStorage.removeItem(META_KEY);
}

/** Estimate storage used by backups (bytes). */
export async function getStorageUsage(): Promise<number> {
  try {
    const dir = getBackupsDir();
    if (!dir.exists) return 0;
    const info = dir.info();
    return info.size ?? 0;
  } catch {
    return 0;
  }
}
