import { describe, it, expect } from 'vitest';
import { mergeUserMarks, mergeBlockRanges, IdMap } from '../src/index.js';
import type { UserMark, BlockRange } from '../src/index.js';

function makeMark(overrides: Partial<UserMark> & { UserMarkId: number; UserMarkGuid: string }): UserMark {
  return {
    ColorIndex: 1,
    LocationId: 1,
    StyleIndex: 0,
    Version: 1,
    ...overrides,
  };
}

function makeRange(overrides: Partial<BlockRange> & { BlockRangeId: number; UserMarkId: number }): BlockRange {
  return {
    BlockType: 1,
    Identifier: 1,
    StartToken: 0,
    EndToken: 10,
    ...overrides,
  };
}

function setupLocationMaps(): { idMapA: IdMap; idMapB: IdMap } {
  const idMapA = new IdMap();
  const idMapB = new IdMap();
  idMapA.set('Location', 1, 1);
  idMapA.set('Location', 2, 2);
  idMapB.set('Location', 10, 3);
  idMapB.set('Location', 20, 4);
  // Shared location (same natural key mapped to same new ID)
  idMapB.set('Location', 1, 1);
  return { idMapA, idMapB };
}

describe('mergeUserMarks', () => {
  it('should keep unique marks from both sources', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'aaa', LocationId: 1 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'bbb', LocationId: 10 })];

    const { merged } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.UserMarkGuid).toBe('aaa');
    expect(merged[1]!.UserMarkGuid).toBe('bbb');
  });

  it('should remap LocationId', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'aaa', LocationId: 1 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'bbb', LocationId: 10 })];

    const { merged } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    expect(merged[0]!.LocationId).toBe(1); // idMapA: 1→1
    expect(merged[1]!.LocationId).toBe(3); // idMapB: 10→3
  });

  it('should deduplicate identical marks (same Guid)', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'shared', LocationId: 1, ColorIndex: 1, Version: 1 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'shared', LocationId: 1, ColorIndex: 1, Version: 1 })];

    const { merged } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    expect(merged).toHaveLength(1);
  });

  it('should keep newer version on conflict (B has higher Version)', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'conflict', LocationId: 1, ColorIndex: 1, Version: 1 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'conflict', LocationId: 1, ColorIndex: 3, Version: 2 })];

    const { merged, winners } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.ColorIndex).toBe(3); // B's color
    expect(merged[0]!.Version).toBe(2);
    expect(winners.get(merged[0]!.UserMarkId)).toBe('B');
  });

  it('should keep newer version on StyleIndex conflict', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'style', LocationId: 1, StyleIndex: 0, Version: 1 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'style', LocationId: 1, StyleIndex: 1, Version: 3 })];

    const { merged, winners } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.StyleIndex).toBe(1); // B's style
    expect(merged[0]!.Version).toBe(3);
    expect(winners.get(merged[0]!.UserMarkId)).toBe('B');
  });

  it('should keep A on version tie', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'tie', LocationId: 1, ColorIndex: 2, Version: 1 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'tie', LocationId: 1, ColorIndex: 5, Version: 1 })];

    const { merged, winners } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    expect(merged[0]!.ColorIndex).toBe(2); // A wins ties
    expect(winners.get(merged[0]!.UserMarkId)).toBe('A');
  });

  it('should map both old IDs to same new ID on match', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'shared', LocationId: 1 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'shared', LocationId: 1 })];

    mergeUserMarks(marksA, marksB, idMapA, idMapB);

    expect(idMapA.get('UserMark', 1)).toBe(idMapB.get('UserMark', 10));
  });

  it('should assign sequential IDs', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const marksA = [
      makeMark({ UserMarkId: 100, UserMarkGuid: 'a1', LocationId: 1 }),
      makeMark({ UserMarkId: 200, UserMarkGuid: 'a2', LocationId: 2 }),
    ];
    const marksB = [makeMark({ UserMarkId: 50, UserMarkGuid: 'b1', LocationId: 10 })];

    const { merged } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    expect(merged.map((m) => m.UserMarkId)).toEqual([1, 2, 3]);
  });

  it('should handle both sources empty', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const { merged } = mergeUserMarks([], [], idMapA, idMapB);
    expect(merged).toHaveLength(0);
  });

  it('should track winners for all entries', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'a1', LocationId: 1 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'b1', LocationId: 10 })];

    const { merged, winners } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    expect(winners.size).toBe(merged.length);
    expect(winners.get(1)).toBe('A');
    expect(winners.get(2)).toBe('B');
  });

  it('should update counter after merge', () => {
    const { idMapA, idMapB } = setupLocationMaps();
    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'a1', LocationId: 1 })];

    mergeUserMarks(marksA, [], idMapA, idMapB);

    expect(idMapA.getCounter('UserMark')).toBe(2);
  });
});

describe('mergeBlockRanges', () => {
  function setupWithUserMarks() {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    // Location mappings
    idMapA.set('Location', 1, 1);
    idMapB.set('Location', 10, 2);
    idMapB.set('Location', 1, 1);
    return { idMapA, idMapB };
  }

  it('should keep ranges from winner source (A wins)', () => {
    const { idMapA, idMapB } = setupWithUserMarks();

    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'shared', LocationId: 1, Version: 2 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'shared', LocationId: 1, Version: 1 })];
    const { winners } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    const rangesA = [
      makeRange({ BlockRangeId: 1, UserMarkId: 1, StartToken: 0, EndToken: 5 }),
      makeRange({ BlockRangeId: 2, UserMarkId: 1, StartToken: 10, EndToken: 20 }),
    ];
    const rangesB = [
      makeRange({ BlockRangeId: 10, UserMarkId: 10, StartToken: 0, EndToken: 50 }),
    ];

    const merged = mergeBlockRanges(rangesA, rangesB, idMapA, idMapB, winners);

    // A won, so A's 2 ranges should be kept
    expect(merged).toHaveLength(2);
    expect(merged[0]!.StartToken).toBe(0);
    expect(merged[0]!.EndToken).toBe(5);
    expect(merged[1]!.StartToken).toBe(10);
    expect(merged[1]!.EndToken).toBe(20);
  });

  it('should keep ranges from winner source (B wins)', () => {
    const { idMapA, idMapB } = setupWithUserMarks();

    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'shared', LocationId: 1, Version: 1 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'shared', LocationId: 1, Version: 3 })];
    const { winners } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    const rangesA = [makeRange({ BlockRangeId: 1, UserMarkId: 1 })];
    const rangesB = [makeRange({ BlockRangeId: 10, UserMarkId: 10, StartToken: 99, EndToken: 100 })];

    const merged = mergeBlockRanges(rangesA, rangesB, idMapA, idMapB, winners);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.StartToken).toBe(99);
    expect(merged[0]!.EndToken).toBe(100);
  });

  it('should remap UserMarkId to new ID', () => {
    const { idMapA, idMapB } = setupWithUserMarks();

    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'a1', LocationId: 1 })];
    const { winners } = mergeUserMarks(marksA, [], idMapA, idMapB);

    const rangesA = [makeRange({ BlockRangeId: 1, UserMarkId: 1 })];
    const merged = mergeBlockRanges(rangesA, [], idMapA, idMapB, winners);

    expect(merged[0]!.UserMarkId).toBe(1); // new UserMarkId
  });

  it('should handle multiple ranges per UserMark', () => {
    const { idMapA, idMapB } = setupWithUserMarks();

    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'a1', LocationId: 1 })];
    const { winners } = mergeUserMarks(marksA, [], idMapA, idMapB);

    const rangesA = [
      makeRange({ BlockRangeId: 1, UserMarkId: 1, Identifier: 1 }),
      makeRange({ BlockRangeId: 2, UserMarkId: 1, Identifier: 2 }),
      makeRange({ BlockRangeId: 3, UserMarkId: 1, Identifier: 3 }),
    ];
    const merged = mergeBlockRanges(rangesA, [], idMapA, idMapB, winners);

    expect(merged).toHaveLength(3);
    expect(merged.map((r) => r.Identifier)).toEqual([1, 2, 3]);
  });

  it('should handle unique marks from both sources', () => {
    const { idMapA, idMapB } = setupWithUserMarks();

    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'a1', LocationId: 1 })];
    const marksB = [makeMark({ UserMarkId: 10, UserMarkGuid: 'b1', LocationId: 10 })];
    const { winners } = mergeUserMarks(marksA, marksB, idMapA, idMapB);

    const rangesA = [makeRange({ BlockRangeId: 1, UserMarkId: 1 })];
    const rangesB = [makeRange({ BlockRangeId: 10, UserMarkId: 10, StartToken: 50, EndToken: 60 })];

    const merged = mergeBlockRanges(rangesA, rangesB, idMapA, idMapB, winners);

    expect(merged).toHaveLength(2);
  });

  it('should assign sequential BlockRangeIds', () => {
    const { idMapA, idMapB } = setupWithUserMarks();

    const marksA = [
      makeMark({ UserMarkId: 1, UserMarkGuid: 'a1', LocationId: 1 }),
      makeMark({ UserMarkId: 2, UserMarkGuid: 'a2', LocationId: 1 }),
    ];
    const { winners } = mergeUserMarks(marksA, [], idMapA, idMapB);

    const rangesA = [
      makeRange({ BlockRangeId: 100, UserMarkId: 1 }),
      makeRange({ BlockRangeId: 200, UserMarkId: 2 }),
    ];
    const merged = mergeBlockRanges(rangesA, [], idMapA, idMapB, winners);

    expect(merged.map((r) => r.BlockRangeId)).toEqual([1, 2]);
  });

  it('should handle UserMark with no BlockRanges', () => {
    const { idMapA, idMapB } = setupWithUserMarks();

    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'a1', LocationId: 1 })];
    const { winners } = mergeUserMarks(marksA, [], idMapA, idMapB);

    const merged = mergeBlockRanges([], [], idMapA, idMapB, winners);

    expect(merged).toHaveLength(0);
  });

  it('should handle both sources empty', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const winners = new Map<number, 'A' | 'B'>();

    const merged = mergeBlockRanges([], [], idMapA, idMapB, winners);
    expect(merged).toHaveLength(0);
  });

  it('should preserve BlockType and null tokens', () => {
    const { idMapA, idMapB } = setupWithUserMarks();

    const marksA = [makeMark({ UserMarkId: 1, UserMarkGuid: 'a1', LocationId: 1 })];
    const { winners } = mergeUserMarks(marksA, [], idMapA, idMapB);

    const rangesA = [makeRange({ BlockRangeId: 1, UserMarkId: 1, BlockType: 2, StartToken: null, EndToken: null })];
    const merged = mergeBlockRanges(rangesA, [], idMapA, idMapB, winners);

    expect(merged[0]!.BlockType).toBe(2);
    expect(merged[0]!.StartToken).toBeNull();
    expect(merged[0]!.EndToken).toBeNull();
  });
});
