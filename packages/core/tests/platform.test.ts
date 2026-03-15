import { describe, it, expect } from 'vitest';

describe('platform adapter interface', () => {
  it('should export types without errors', async () => {
    const { type } = await import('../src/index.js');
    // Type-only exports don't have runtime values, but the import should succeed
    expect(true).toBe(true);
  });
});
