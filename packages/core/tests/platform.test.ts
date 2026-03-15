import { describe, it, expect } from 'vitest';
import type { PlatformAdapter, Database, Row, ZipContents } from '../src/platform.js';

describe('PlatformAdapter types', () => {
  it('should define all required methods in the interface', () => {
    // Type-level check: ensure a mock object satisfies the interface
    const _mockAdapter: PlatformAdapter = {
      openDatabase: async () => ({}) as Database,
      createDatabase: async () => ({}) as Database,
      executeQuery: async () => [] as Row[],
      executeRun: async () => {},
      exportDatabase: async () => new Uint8Array(),
      closeDatabase: async () => {},
      extractZip: async () => ({ files: new Map() }) as ZipContents,
      createZip: async () => new Uint8Array(),
      hashSHA256: async () => '',
    };
    expect(_mockAdapter).toBeDefined();
  });
});
