import initSqlJs, { type SqlJsStatic, type Database as SqlJsDatabase } from 'sql.js';
import JSZip from 'jszip';
import type { PlatformAdapter, Database, Row, ZipContents, ZipEntry } from '@jw-notes-sync/core';

// Cache the sql.js initialization promise so we only load WASM once
let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    const isBrowser = typeof window !== 'undefined';
    sqlJsPromise = initSqlJs(
      isBrowser
        ? { locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm` }
        : undefined,
    ) as Promise<SqlJsStatic>;
  }
  return sqlJsPromise;
}

/** Unwrap our branded Database type to the actual sql.js Database */
function unwrap(db: Database): SqlJsDatabase {
  return db as unknown as SqlJsDatabase;
}

/** Wrap a sql.js Database into our branded type */
function wrap(db: SqlJsDatabase): Database {
  return db as unknown as Database;
}

/**
 * Web platform adapter implementation.
 * Uses sql.js (WASM) for SQLite, JSZip for archives, Web Crypto for hashing.
 */
export const webAdapter: PlatformAdapter = {
  // ── SQLite ──────────────────────────────────────────────

  async openDatabase(bytes: Uint8Array): Promise<Database> {
    const SQL = await getSqlJs();
    return wrap(new SQL.Database(bytes));
  },

  async createDatabase(): Promise<Database> {
    const SQL = await getSqlJs();
    return wrap(new SQL.Database());
  },

  async executeQuery(db: Database, sql: string, params?: unknown[]): Promise<Row[]> {
    const sqlDb = unwrap(db);
    const stmt = sqlDb.prepare(sql);

    if (params && params.length > 0) {
      stmt.bind(params as (string | number | Uint8Array | null)[]);
    }

    const rows: Row[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push(row as Row);
    }
    stmt.free();
    return rows;
  },

  async executeRun(db: Database, sql: string, params?: unknown[]): Promise<void> {
    const sqlDb = unwrap(db);
    if (params && params.length > 0) {
      sqlDb.run(sql, params as (string | number | Uint8Array | null)[]);
    } else {
      sqlDb.run(sql);
    }
  },

  async exportDatabase(db: Database): Promise<Uint8Array> {
    const sqlDb = unwrap(db);
    return sqlDb.export();
  },

  async closeDatabase(db: Database): Promise<void> {
    const sqlDb = unwrap(db);
    sqlDb.close();
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
    const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },
};
