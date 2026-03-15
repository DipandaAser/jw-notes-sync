/**
 * Centralized ID remapping engine.
 *
 * During merge, each source DB's IDs are remapped to new sequential IDs
 * in the merged output. This class tracks old→new mappings per table.
 */
export class IdMap {
  private maps = new Map<string, Map<number, number>>();
  private counters = new Map<string, number>();

  /**
   * Set the next available ID for a table (e.g. max existing ID + 1).
   */
  setCounter(table: string, startId: number): void {
    this.counters.set(table, startId);
  }

  /**
   * Get the current counter value for a table.
   */
  getCounter(table: string): number {
    return this.counters.get(table) ?? 1;
  }

  /**
   * Allocate the next ID for a table and return it.
   */
  nextId(table: string): number {
    const current = this.counters.get(table) ?? 1;
    this.counters.set(table, current + 1);
    return current;
  }

  /**
   * Record a mapping from oldId → newId for a given table.
   */
  set(table: string, oldId: number, newId: number): void {
    let tableMap = this.maps.get(table);
    if (!tableMap) {
      tableMap = new Map();
      this.maps.set(table, tableMap);
    }
    tableMap.set(oldId, newId);
  }

  /**
   * Look up the new ID for an old ID in a given table.
   * Throws if the mapping doesn't exist.
   */
  get(table: string, oldId: number): number {
    const tableMap = this.maps.get(table);
    if (!tableMap) {
      throw new Error(`No ID mappings registered for table "${table}"`);
    }
    const newId = tableMap.get(oldId);
    if (newId === undefined) {
      throw new Error(`No mapping for ${table} oldId=${oldId}`);
    }
    return newId;
  }

  /**
   * Look up the new ID, returning undefined if not found.
   */
  tryGet(table: string, oldId: number): number | undefined {
    return this.maps.get(table)?.get(oldId);
  }

  /**
   * Check if a mapping exists for the given table and oldId.
   */
  has(table: string, oldId: number): boolean {
    return this.maps.get(table)?.has(oldId) ?? false;
  }
}
