import type { UserMark, BlockRange } from './models.js';
import type { IdMap } from './id-map.js';
import type { HighlightConflictStrategy } from './merge-config.js';
import { groupBy, buildReverseIndex } from './utils.js';

/**
 * Merge UserMark tables from two databases.
 *
 * **Merge order: 2** — depends on Location (step 1).
 * `Location` mappings must exist in idMapA/idMapB before calling.
 * Populates `UserMark` mappings used by Note (step 3) and BlockRange (step 4).
 *
 * Strategy:
 * - Match by UserMarkGuid
 * - Identical → keep one, remap LocationId
 * - Conflict (different ColorIndex/StyleIndex) → keep newer (higher Version)
 * - Unique → carry over with remapped LocationId
 *
 * Returns the chosen source for each matched UserMark ('A' or 'B') keyed by
 * the new UserMarkId, so BlockRange merge knows which source's ranges to keep.
 */
export interface MergeUserMarksOptions {
  strategy?: HighlightConflictStrategy;
}

export function mergeUserMarks(
  marksA: UserMark[],
  marksB: UserMark[],
  idMapA: IdMap,
  idMapB: IdMap,
  options?: MergeUserMarksOptions,
): { merged: UserMark[]; winners: Map<number, 'A' | 'B'> } {
  const strategy = options?.strategy ?? 'keepNewest';
  const TABLE = 'UserMark';
  const merged: UserMark[] = [];
  const winners = new Map<number, 'A' | 'B'>();
  let nextId = 1;

  // Index B by UserMarkGuid
  const bByGuid = new Map<string, UserMark>();
  for (const mark of marksB) {
    bByGuid.set(mark.UserMarkGuid, mark);
  }

  const matchedBGuids = new Set<string>();

  for (const markA of marksA) {
    const markB = bByGuid.get(markA.UserMarkGuid);
    const newId = nextId++;

    if (markB) {
      matchedBGuids.add(markB.UserMarkGuid);

      // Pick winner based on strategy
      let winner: UserMark;
      if (strategy === 'keepA') {
        winner = markA;
      } else if (strategy === 'keepB') {
        winner = markB;
      } else {
        // 'keepNewest': higher Version wins, A wins ties
        winner = markB.Version > markA.Version ? markB : markA;
      }
      const winnerSource: 'A' | 'B' = winner === markA ? 'A' : 'B';
      const winnerIdMap = winnerSource === 'A' ? idMapA : idMapB;

      merged.push({
        ...winner,
        UserMarkId: newId,
        LocationId: winnerIdMap.get('Location', winner.LocationId),
      });

      winners.set(newId, winnerSource);
      idMapA.set(TABLE, markA.UserMarkId, newId);
      idMapB.set(TABLE, markB.UserMarkId, newId);
    } else {
      // Unique to A
      merged.push({
        ...markA,
        UserMarkId: newId,
        LocationId: idMapA.get('Location', markA.LocationId),
      });
      winners.set(newId, 'A');
      idMapA.set(TABLE, markA.UserMarkId, newId);
    }
  }

  // Unique to B
  for (const markB of marksB) {
    if (!matchedBGuids.has(markB.UserMarkGuid)) {
      const newId = nextId++;
      merged.push({
        ...markB,
        UserMarkId: newId,
        LocationId: idMapB.get('Location', markB.LocationId),
      });
      winners.set(newId, 'B');
      idMapB.set(TABLE, markB.UserMarkId, newId);
    }
  }

  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return { merged, winners };
}

/**
 * Merge BlockRange tables from two databases.
 *
 * **Merge order: 4** — depends on UserMark (step 2).
 * `UserMark` mappings must exist in idMapA/idMapB before calling.
 *
 * Strategy: follow parent UserMark. For matched UserMarks, keep BlockRanges
 * from whichever source won the UserMark conflict. For unique UserMarks,
 * keep all their BlockRanges.
 */
export function mergeBlockRanges(
  rangesA: BlockRange[],
  rangesB: BlockRange[],
  idMapA: IdMap,
  idMapB: IdMap,
  winners: Map<number, 'A' | 'B'>,
): BlockRange[] {
  const TABLE = 'BlockRange';
  const PARENT_TABLE = 'UserMark';
  const merged: BlockRange[] = [];
  let nextId = 1;

  // Group ranges by UserMarkId for each source
  const aByUserMark = groupBy(rangesA, (r) => r.UserMarkId);
  const bByUserMark = groupBy(rangesB, (r) => r.UserMarkId);

  // Build reverse indexes: newUserMarkId → oldUserMarkId (O(n) upfront)
  const reverseA = buildReverseIndex(aByUserMark, idMapA, PARENT_TABLE);
  const reverseB = buildReverseIndex(bByUserMark, idMapB, PARENT_TABLE);

  // For each merged UserMark, pick ranges from the winning source
  for (const [newUserMarkId, source] of winners) {
    const reverse = source === 'A' ? reverseA : reverseB;
    const rangeMap = source === 'A' ? aByUserMark : bByUserMark;
    const oldUserMarkId = reverse.get(newUserMarkId);
    const sourceRanges = oldUserMarkId !== undefined ? (rangeMap.get(oldUserMarkId) ?? []) : [];

    for (const range of sourceRanges) {
      const newRangeId = nextId++;
      merged.push({
        ...range,
        BlockRangeId: newRangeId,
        UserMarkId: newUserMarkId,
      });

      const idMap = source === 'A' ? idMapA : idMapB;
      idMap.set(TABLE, range.BlockRangeId, newRangeId);
    }
  }

  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return merged;
}
