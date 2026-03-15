/**
 * Opaque database handle.
 * Branded with a symbol so platform implementations can use their own internal type
 * while the core only passes it around without inspecting it.
 */
export type Database = { readonly __brand: 'Database' };

/** A single row from a SQL query result */
export type Row = Record<string, unknown>;

/** Contents extracted from a ZIP archive */
export interface ZipContents {
  /** Map of file path → file bytes */
  files: Map<string, Uint8Array>;
}

/** An entry to be added to a ZIP archive */
export interface ZipEntry {
  /** File path inside the archive (e.g. "userData.db") */
  path: string;
  /** File contents */
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
  // ── SQLite ──────────────────────────────────────────────

  /** Open a SQLite database from raw bytes */
  openDatabase(bytes: Uint8Array): Promise<Database>;

  /** Create a new empty database */
  createDatabase(): Promise<Database>;

  /** Execute a read query and return result rows */
  executeQuery(db: Database, sql: string, params?: unknown[]): Promise<Row[]>;

  /** Execute a write statement (INSERT, UPDATE, DELETE, CREATE TABLE, etc.) */
  executeRun(db: Database, sql: string, params?: unknown[]): Promise<void>;

  /** Export a database to raw bytes (for writing to a file) */
  exportDatabase(db: Database): Promise<Uint8Array>;

  /** Close a database and free resources */
  closeDatabase(db: Database): Promise<void>;

  // ── ZIP ─────────────────────────────────────────────────

  /** Extract all files from a ZIP archive */
  extractZip(bytes: Uint8Array): Promise<ZipContents>;

  /** Create a ZIP archive from entries */
  createZip(entries: ZipEntry[]): Promise<Uint8Array>;

  // ── Hashing ─────────────────────────────────────────────

  /** Compute SHA-256 hash of data, returned as lowercase hex string */
  hashSHA256(data: Uint8Array): Promise<string>;
}
