import { describe, it, expect } from 'vitest';
import { mergeLocations, locationNaturalKey, IdMap } from '../src/index.js';
import type { Location } from '../src/index.js';

function makeLoc(overrides: Partial<Location> & { LocationId: number }): Location {
  return {
    BookNumber: null,
    ChapterNumber: null,
    DocumentId: null,
    Track: null,
    IssueTagNumber: 0,
    KeySymbol: null,
    MepsLanguage: null,
    Type: 0,
    Title: null,
    ...overrides,
  };
}

describe('locationNaturalKey', () => {
  it('should produce the same key for matching locations', () => {
    const a = makeLoc({ LocationId: 1, BookNumber: 1, ChapterNumber: 3, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 });
    const b = makeLoc({ LocationId: 99, BookNumber: 1, ChapterNumber: 3, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 });
    expect(locationNaturalKey(a)).toBe(locationNaturalKey(b));
  });

  it('should produce different keys when Type differs', () => {
    const a = makeLoc({ LocationId: 1, KeySymbol: 'nwtsty', Type: 0 });
    const b = makeLoc({ LocationId: 2, KeySymbol: 'nwtsty', Type: 1 });
    expect(locationNaturalKey(a)).not.toBe(locationNaturalKey(b));
  });

  it('should handle null fields correctly', () => {
    const a = makeLoc({ LocationId: 1, BookNumber: null, ChapterNumber: null, Type: 0 });
    const b = makeLoc({ LocationId: 2, BookNumber: null, ChapterNumber: null, Type: 0 });
    expect(locationNaturalKey(a)).toBe(locationNaturalKey(b));
  });

  it('should differentiate Track-based locations', () => {
    const a = makeLoc({ LocationId: 1, KeySymbol: 'sjj', Track: 1, Type: 0 });
    const b = makeLoc({ LocationId: 2, KeySymbol: 'sjj', Track: 2, Type: 0 });
    expect(locationNaturalKey(a)).not.toBe(locationNaturalKey(b));
  });
});

describe('mergeLocations', () => {
  it('should merge matching locations and keep non-null Title from A', () => {
    const a = [makeLoc({ LocationId: 1, BookNumber: 1, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0, Title: 'Genesis 1' })];
    const b = [makeLoc({ LocationId: 5, BookNumber: 1, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0, Title: null })];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations(a, b, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.Title).toBe('Genesis 1');
    expect(merged[0]!.LocationId).toBe(1);
    expect(idMapA.get('Location', 1)).toBe(1);
    expect(idMapB.get('Location', 5)).toBe(1);
  });

  it('should keep non-null Title from B when A is null', () => {
    const a = [makeLoc({ LocationId: 1, BookNumber: 1, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0, Title: null })];
    const b = [makeLoc({ LocationId: 5, BookNumber: 1, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0, Title: 'Genèse 1' })];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations(a, b, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.Title).toBe('Genèse 1');
  });

  it('should include locations unique to each source', () => {
    const a = [
      makeLoc({ LocationId: 1, BookNumber: 1, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 }),
      makeLoc({ LocationId: 2, BookNumber: 2, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 }),
    ];
    const b = [
      makeLoc({ LocationId: 10, BookNumber: 1, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 }),
      makeLoc({ LocationId: 11, BookNumber: 3, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 }),
    ];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations(a, b, idMapA, idMapB);

    // 1 match + 1 unique A + 1 unique B = 3
    expect(merged).toHaveLength(3);
  });

  it('should assign sequential IDs starting from 1', () => {
    const a = [
      makeLoc({ LocationId: 100, BookNumber: 1, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 }),
      makeLoc({ LocationId: 200, BookNumber: 2, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 }),
    ];
    const b = [
      makeLoc({ LocationId: 50, BookNumber: 3, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 }),
    ];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations(a, b, idMapA, idMapB);

    expect(merged.map((l) => l.LocationId)).toEqual([1, 2, 3]);
    expect(idMapA.get('Location', 100)).toBe(1);
    expect(idMapA.get('Location', 200)).toBe(2);
    expect(idMapB.get('Location', 50)).toBe(3);
  });

  it('should handle empty source A', () => {
    const b = [makeLoc({ LocationId: 1, BookNumber: 1, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 })];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations([], b, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(idMapB.get('Location', 1)).toBe(1);
  });

  it('should handle empty source B', () => {
    const a = [makeLoc({ LocationId: 1, BookNumber: 1, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 })];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations(a, [], idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(idMapA.get('Location', 1)).toBe(1);
  });

  it('should handle both sources empty', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations([], [], idMapA, idMapB);

    expect(merged).toHaveLength(0);
  });

  it('should handle null BookNumbers (non-Bible locations)', () => {
    const a = [makeLoc({ LocationId: 1, DocumentId: 12345, KeySymbol: 'w22', MepsLanguage: 2, Type: 0 })];
    const b = [makeLoc({ LocationId: 2, DocumentId: 12345, KeySymbol: 'w22', MepsLanguage: 2, Type: 0 })];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations(a, b, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(idMapA.get('Location', 1)).toBe(idMapB.get('Location', 2));
  });

  it('should handle Track-based locations', () => {
    const a = [makeLoc({ LocationId: 1, KeySymbol: 'sjj', DocumentId: 100, Track: 5, MepsLanguage: 2, Type: 0 })];
    const b = [makeLoc({ LocationId: 2, KeySymbol: 'sjj', DocumentId: 100, Track: 5, MepsLanguage: 2, Type: 0 })];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations(a, b, idMapA, idMapB);

    expect(merged).toHaveLength(1);
  });

  it('should treat different Tracks as different locations', () => {
    const a = [makeLoc({ LocationId: 1, KeySymbol: 'sjj', DocumentId: 100, Track: 5, MepsLanguage: 2, Type: 0 })];
    const b = [makeLoc({ LocationId: 2, KeySymbol: 'sjj', DocumentId: 100, Track: 6, MepsLanguage: 2, Type: 0 })];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations(a, b, idMapA, idMapB);

    expect(merged).toHaveLength(2);
  });

  it('should handle Bible chapter locations', () => {
    // Bible chapters: BookNumber + ChapterNumber + KeySymbol
    const a = [makeLoc({ LocationId: 1, BookNumber: 43, ChapterNumber: 17, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0, Title: 'Jean 17' })];
    const b = [makeLoc({ LocationId: 7, BookNumber: 43, ChapterNumber: 17, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0, Title: 'John 17' })];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const merged = mergeLocations(a, b, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    // A's title wins since it's non-null and processed first
    expect(merged[0]!.Title).toBe('Jean 17');
  });

  it('should update ID counter after merge', () => {
    const a = [makeLoc({ LocationId: 1, BookNumber: 1, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 })];
    const b = [makeLoc({ LocationId: 2, BookNumber: 2, ChapterNumber: 1, KeySymbol: 'nwtsty', MepsLanguage: 2, Type: 0 })];

    const idMapA = new IdMap();
    const idMapB = new IdMap();
    mergeLocations(a, b, idMapA, idMapB);

    // 2 locations created, counter should be at 3
    expect(idMapA.getCounter('Location')).toBe(3);
  });
});

describe('IdMap', () => {
  it('should store and retrieve mappings', () => {
    const map = new IdMap();
    map.set('Location', 5, 1);
    expect(map.get('Location', 5)).toBe(1);
  });

  it('should throw for missing table', () => {
    const map = new IdMap();
    expect(() => map.get('NoTable', 1)).toThrow('No ID mappings registered');
  });

  it('should throw for missing ID', () => {
    const map = new IdMap();
    map.set('Location', 1, 1);
    expect(() => map.get('Location', 999)).toThrow('No mapping for Location oldId=999');
  });

  it('should return undefined from tryGet for missing entries', () => {
    const map = new IdMap();
    expect(map.tryGet('Location', 1)).toBeUndefined();
  });

  it('should track counters independently per table', () => {
    const map = new IdMap();
    map.setCounter('Location', 10);
    map.setCounter('Note', 5);

    expect(map.nextId('Location')).toBe(10);
    expect(map.nextId('Location')).toBe(11);
    expect(map.nextId('Note')).toBe(5);
  });

  it('should report has correctly', () => {
    const map = new IdMap();
    map.set('Location', 1, 10);
    expect(map.has('Location', 1)).toBe(true);
    expect(map.has('Location', 2)).toBe(false);
    expect(map.has('Other', 1)).toBe(false);
  });
});
