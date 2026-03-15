/** Opaque database handle — platform-specific implementation */
export type Database = unknown;

/** A single row from a SQL query result */
export type Row = Record<string, unknown>;

/** Contents extracted from a ZIP archive */
export interface ZipContents {
  files: Map<string, Uint8Array>;
}

/** An entry to be added to a ZIP archive */
export interface ZipEntry {
  path: string;
  data: Uint8Array;
}

/**
 * Platform adapter interface.
 *
 * The core engine uses this to abstract SQLite, ZIP, and hashing operations
 * so that it remains pure TypeScript with zero platform-specific dependencies.
 *
 * Each platform (web, mobile) provides its own implementation.
 */
export interface PlatformAdapter {
  /** Open a SQLite database from raw bytes */
  openDatabase(bytes: Uint8Array): Promise<Database>;

  /** Execute a SQL query and return result rows */
  executeQuery(db: Database, sql: string, params?: unknown[]): Promise<Row[]>;

  /** Execute a SQL statement that doesn't return rows (INSERT, UPDATE, etc.) */
  executeRun(db: Database, sql: string, params?: unknown[]): Promise<void>;

  /** Close a database and free resources */
  closeDatabase(db: Database): Promise<void>;

  /** Export a database to raw bytes */
  exportDatabase(db: Database): Promise<Uint8Array>;

  /** Create an empty database with no tables */
  createDatabase(): Promise<Database>;

  /** Extract all files from a ZIP archive */
  extractZip(bytes: Uint8Array): Promise<ZipContents>;

  /** Create a ZIP archive from entries */
  createZip(entries: ZipEntry[]): Promise<Uint8Array>;

  /** Compute SHA-256 hash of data, returned as hex string */
  hashSHA256(data: Uint8Array): Promise<string>;
}
