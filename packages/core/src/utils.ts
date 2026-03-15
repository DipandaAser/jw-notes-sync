/**
 * Group items by a numeric key.
 */
export function groupBy<T>(items: T[], keyFn: (item: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    let group = map.get(key);
    if (!group) {
      group = [];
      map.set(key, group);
    }
    group.push(item);
  }
  return map;
}

/**
 * Build a reverse index from an IdMap: newId → oldId for a given table.
 * Useful when you need to look up which old ID produced a given new ID.
 */
export function buildReverseIndex(
  groupedByOldId: Map<number, unknown>,
  idMap: { tryGet(table: string, oldId: number): number | undefined },
  table: string,
): Map<number, number> {
  const reverse = new Map<number, number>();
  for (const oldId of groupedByOldId.keys()) {
    const newId = idMap.tryGet(table, oldId);
    if (newId !== undefined) {
      reverse.set(newId, oldId);
    }
  }
  return reverse;
}
