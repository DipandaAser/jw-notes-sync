import * as SQLite from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import JSZip from 'jszip';
import type { PlatformAdapter, Database, Row, ZipContents, ZipEntry } from '@jw-notes-sync/core';

// ── Helpers ────────────────────────────────────────────────

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Database handle tracking ───────────────────────────────

interface DbHandle {
  db: SQLite.SQLiteDatabase;
  file: File;
}

const handleMap = new Map<Database, DbHandle>();
let dbCounter = 0;

function wrap(handle: DbHandle): Database {
  const branded = {} as Database;
  handleMap.set(branded, handle);
  return branded;
}

function unwrap(db: Database): DbHandle {
  const handle = handleMap.get(db);
  if (!handle) throw new Error('Invalid database handle');
  return handle;
}

/** Directory URI where temp DB files are stored */
const DB_DIR = Paths.document.uri;

function getTempDbFile(): File {
  return new File(Paths.document, `tmp_db_${Date.now()}_${dbCounter++}.db`);
}

// ── Cleanup stale temp files on init ───────────────────────

function cleanupStaleTempFiles(): void {
  try {
    const docDir = Paths.document;
    if (!docDir.exists) return;
    const entries = docDir.list();
    for (const entry of entries) {
      if (entry instanceof File && entry.name.startsWith('tmp_db_')) {
        entry.delete();
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Run cleanup on module load
cleanupStaleTempFiles();

/**
 * Native platform adapter for React Native (Expo).
 * Uses expo-sqlite for SQLite, JSZip for archives, expo-crypto for hashing.
 */
export const nativeAdapter: PlatformAdapter = {
  // ── SQLite ──────────────────────────────────────────────

  async openDatabase(bytes: Uint8Array): Promise<Database> {
    const file = getTempDbFile();
    const base64 = uint8ArrayToBase64(bytes);
    file.write(base64, { encoding: 'base64' });

    const db = await SQLite.openDatabaseAsync(file.name, {}, DB_DIR);
    return wrap({ db, file });
  },

  async createDatabase(): Promise<Database> {
    const file = getTempDbFile();
    const db = await SQLite.openDatabaseAsync(file.name, {}, DB_DIR);
    return wrap({ db, file });
  },

  async executeQuery(db: Database, sql: string, params?: unknown[]): Promise<Row[]> {
    const { db: sqliteDb } = unwrap(db);
    const rows = await sqliteDb.getAllAsync(sql, (params ?? []) as SQLite.SQLiteBindParams);
    return rows as Row[];
  },

  async executeRun(db: Database, sql: string, params?: unknown[]): Promise<void> {
    const { db: sqliteDb } = unwrap(db);
    await sqliteDb.runAsync(sql, (params ?? []) as SQLite.SQLiteBindParams);
  },

  async exportDatabase(db: Database): Promise<Uint8Array> {
    const { db: sqliteDb, file } = unwrap(db);
    // Switch to rollback journal and checkpoint WAL so the .db file is self-contained
    await sqliteDb.runAsync('PRAGMA wal_checkpoint(TRUNCATE)');
    await sqliteDb.runAsync('PRAGMA journal_mode = DELETE');
    await sqliteDb.closeAsync();

    const base64 = await file.base64();

    // Reopen so the handle stays valid
    const reopened = await SQLite.openDatabaseAsync(file.name, {}, DB_DIR);
    const handle = handleMap.get(db)!;
    handle.db = reopened;

    return base64ToUint8Array(base64);
  },

  async closeDatabase(db: Database): Promise<void> {
    const handle = handleMap.get(db);
    if (!handle) return;
    await handle.db.closeAsync();
    try {
      handle.file.delete();
    } catch {
      // Ignore if already deleted
    }
    handleMap.delete(db);
  },

  // ── ZIP ─────────────────────────────────────────────────

  async extractZip(bytes: Uint8Array): Promise<ZipContents> {
    const zip = await JSZip.loadAsync(bytes);
    const files = new Map<string, Uint8Array>();

    const promises: Promise<void>[] = [];
    zip.forEach((relativePath, file) => {
      if (!file.dir) {
        promises.push(
          file.async('uint8array').then((data) => {
            files.set(relativePath, data);
          }),
        );
      }
    });
    await Promise.all(promises);

    return { files };
  },

  async createZip(entries: ZipEntry[]): Promise<Uint8Array> {
    const zip = new JSZip();
    for (const entry of entries) {
      zip.file(entry.path, entry.data);
    }
    return zip.generateAsync({ type: 'uint8array' });
  },

  // ── Hashing ─────────────────────────────────────────────

  async hashSHA256(data: Uint8Array): Promise<string> {
    const buffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data as Uint8Array<ArrayBuffer>);
    const hashArray = new Uint8Array(buffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },
};
