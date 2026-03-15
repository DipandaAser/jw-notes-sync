import type { PlatformAdapter } from './platform.js';

/**
 * Contract test suite for PlatformAdapter implementations.
 *
 * Call `runAdapterContractTests(adapter, describe, it, expect)` from any
 * test framework (Vitest, Jest, etc.) to verify an adapter meets the contract.
 */
export function runAdapterContractTests(
  adapter: PlatformAdapter,
  describe: (name: string, fn: () => void) => void,
  it: (name: string, fn: () => Promise<void>) => void,
  expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toBeGreaterThan: (expected: number) => void;
    toContain: (expected: unknown) => void;
    toMatch: (expected: RegExp) => void;
    toBeDefined: () => void;
    toHaveLength: (expected: number) => void;
  },
): void {
  describe('SQLite operations', () => {
    it('should create a new empty database', async () => {
      const db = await adapter.createDatabase();
      expect(db).toBeDefined();
      await adapter.closeDatabase(db);
    });

    it('should create tables and insert data', async () => {
      const db = await adapter.createDatabase();
      await adapter.executeRun(
        db,
        'CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
      );
      await adapter.executeRun(db, "INSERT INTO test (id, name) VALUES (1, 'hello')");
      await adapter.executeRun(db, "INSERT INTO test (id, name) VALUES (2, 'world')");

      const rows = await adapter.executeQuery(db, 'SELECT * FROM test ORDER BY id');
      expect(rows).toHaveLength(2);
      expect(rows[0]!['id']).toBe(1);
      expect(rows[0]!['name']).toBe('hello');
      expect(rows[1]!['id']).toBe(2);
      expect(rows[1]!['name']).toBe('world');

      await adapter.closeDatabase(db);
    });

    it('should support parameterized queries', async () => {
      const db = await adapter.createDatabase();
      await adapter.executeRun(
        db,
        'CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)',
      );
      await adapter.executeRun(db, 'INSERT INTO test (id, value) VALUES (?, ?)', [
        1,
        "it's a test",
      ]);

      const rows = await adapter.executeQuery(
        db,
        'SELECT value FROM test WHERE id = ?',
        [1],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!['value']).toBe("it's a test");

      await adapter.closeDatabase(db);
    });

    it('should export and reimport a database', async () => {
      const db = await adapter.createDatabase();
      await adapter.executeRun(
        db,
        'CREATE TABLE items (id INTEGER PRIMARY KEY, data TEXT)',
      );
      await adapter.executeRun(db, "INSERT INTO items (id, data) VALUES (1, 'persisted')");

      const bytes = await adapter.exportDatabase(db);
      await adapter.closeDatabase(db);

      expect(bytes.byteLength).toBeGreaterThan(0);

      // Reimport
      const db2 = await adapter.openDatabase(bytes);
      const rows = await adapter.executeQuery(db2, 'SELECT data FROM items WHERE id = 1');
      expect(rows).toHaveLength(1);
      expect(rows[0]!['data']).toBe('persisted');

      await adapter.closeDatabase(db2);
    });

    it('should handle empty query results', async () => {
      const db = await adapter.createDatabase();
      await adapter.executeRun(
        db,
        'CREATE TABLE empty_table (id INTEGER PRIMARY KEY)',
      );

      const rows = await adapter.executeQuery(db, 'SELECT * FROM empty_table');
      expect(rows).toHaveLength(0);

      await adapter.closeDatabase(db);
    });
  });

  describe('ZIP operations', () => {
    it('should create and extract a ZIP archive', async () => {
      const content = new TextEncoder().encode('Hello, world!');
      const entries = [
        { path: 'manifest.json', data: new TextEncoder().encode('{"version":1}') },
        { path: 'data/file.txt', data: content },
      ];

      const zipBytes = await adapter.createZip(entries);
      expect(zipBytes.byteLength).toBeGreaterThan(0);

      const extracted = await adapter.extractZip(zipBytes);
      expect(extracted.files.size).toBe(2);
      expect(extracted.files.has('manifest.json')).toBe(true);
      expect(extracted.files.has('data/file.txt')).toBe(true);

      const manifestBytes = extracted.files.get('manifest.json')!;
      const manifestText = new TextDecoder().decode(manifestBytes);
      expect(manifestText).toBe('{"version":1}');

      const fileBytes = extracted.files.get('data/file.txt')!;
      const fileText = new TextDecoder().decode(fileBytes);
      expect(fileText).toBe('Hello, world!');
    });

    it('should handle binary data in ZIP', async () => {
      const binaryData = new Uint8Array([0, 1, 2, 255, 254, 253, 128, 0]);
      const entries = [{ path: 'binary.bin', data: binaryData }];

      const zipBytes = await adapter.createZip(entries);
      const extracted = await adapter.extractZip(zipBytes);

      const result = extracted.files.get('binary.bin')!;
      expect(result).toEqual(binaryData);
    });
  });

  describe('SHA-256 hashing', () => {
    it('should hash empty data', async () => {
      const hash = await adapter.hashSHA256(new Uint8Array(0));
      // SHA-256 of empty input
      expect(hash).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      );
    });

    it('should hash known data', async () => {
      const data = new TextEncoder().encode('hello');
      const hash = await adapter.hashSHA256(data);
      // SHA-256 of "hello"
      expect(hash).toBe(
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      );
    });

    it('should return lowercase hex', async () => {
      const data = new TextEncoder().encode('test');
      const hash = await adapter.hashSHA256(data);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
}
