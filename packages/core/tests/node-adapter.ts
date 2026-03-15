import initSqlJs, { type SqlJsStatic, type Database as SqlJsDatabase } from 'sql.js';
import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import type { PlatformAdapter, Database as BrandedDb, Row, ZipContents, ZipEntry } from '../src/platform.js';

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs() as Promise<SqlJsStatic>;
  }
  return sqlJsPromise;
}

function unwrap(db: BrandedDb): SqlJsDatabase {
  return db as unknown as SqlJsDatabase;
}

function wrap(db: SqlJsDatabase): BrandedDb {
  return db as unknown as BrandedDb;
}

export const nodeAdapter: PlatformAdapter = {
  async openDatabase(bytes: Uint8Array): Promise<BrandedDb> {
    const SQL = await getSqlJs();
    return wrap(new SQL.Database(bytes));
  },

  async createDatabase(): Promise<BrandedDb> {
    const SQL = await getSqlJs();
    return wrap(new SQL.Database());
  },

  async executeQuery(db: BrandedDb, sql: string, params?: unknown[]): Promise<Row[]> {
    const sqlDb = unwrap(db);
    const stmt = sqlDb.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params as (string | number | Uint8Array | null)[]);
    }
    const rows: Row[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Row);
    }
    stmt.free();
    return rows;
  },

  async executeRun(db: BrandedDb, sql: string, params?: unknown[]): Promise<void> {
    const sqlDb = unwrap(db);
    if (params && params.length > 0) {
      sqlDb.run(sql, params as (string | number | Uint8Array | null)[]);
    } else {
      sqlDb.run(sql);
    }
  },

  async exportDatabase(db: BrandedDb): Promise<Uint8Array> {
    return unwrap(db).export();
  },

  async closeDatabase(db: BrandedDb): Promise<void> {
    unwrap(db).close();
  },

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

  async hashSHA256(data: Uint8Array): Promise<string> {
    return createHash('sha256').update(data).digest('hex');
  },
};
