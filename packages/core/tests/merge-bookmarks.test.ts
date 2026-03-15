import { describe, it, expect } from 'vitest';
import { mergeBookmarks, IdMap } from '../src/index.js';
import type { Bookmark } from '../src/index.js';

function makeBm(overrides: Partial<Bookmark> & { BookmarkId: number }): Bookmark {
  return {
    LocationId: 1,
    PublicationLocationId: 1,
    Slot: 0,
    Title: 'Bookmark',
    Snippet: null,
    BlockType: 0,
    BlockIdentifier: null,
    ...overrides,
  };
}

function setupMaps(): { idMapA: IdMap; idMapB: IdMap } {
  const idMapA = new IdMap();
  const idMapB = new IdMap();
  idMapA.set('Location', 1, 1);
  idMapA.set('Location', 2, 2);
  idMapA.set('Location', 3, 3);
  idMapB.set('Location', 10, 4);
  idMapB.set('Location', 20, 5);
  // Shared location (same pub mapped to same new ID)
  idMapB.set('Location', 1, 1);
  idMapB.set('Location', 2, 2);
  return { idMapA, idMapB };
}

describe('mergeBookmarks', () => {
  it('should keep unique bookmarks from both sources', () => {
    const { idMapA, idMapB } = setupMaps();
    const bmA = [makeBm({ BookmarkId: 1, LocationId: 1, PublicationLocationId: 2, Slot: 0 })];
    const bmB = [makeBm({ BookmarkId: 10, LocationId: 10, PublicationLocationId: 20, Slot: 0 })];

    const merged = mergeBookmarks(bmA, bmB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
  });

  it('should remap LocationId and PublicationLocationId', () => {
    const { idMapA, idMapB } = setupMaps();
    const bmA = [makeBm({ BookmarkId: 1, LocationId: 1, PublicationLocationId: 2 })];
    const bmB = [makeBm({ BookmarkId: 10, LocationId: 10, PublicationLocationId: 20 })];

    const merged = mergeBookmarks(bmA, bmB, idMapA, idMapB);

    expect(merged[0]!.LocationId).toBe(1);
    expect(merged[0]!.PublicationLocationId).toBe(2);
    expect(merged[1]!.LocationId).toBe(4);
    expect(merged[1]!.PublicationLocationId).toBe(5);
  });

  it('should keep both when no slot collision (different publications)', () => {
    const { idMapA, idMapB } = setupMaps();
    const bmA = [makeBm({ BookmarkId: 1, LocationId: 1, PublicationLocationId: 2, Slot: 0 })];
    const bmB = [makeBm({ BookmarkId: 10, LocationId: 10, PublicationLocationId: 20, Slot: 0 })];

    const merged = mergeBookmarks(bmA, bmB, idMapA, idMapB);

    // Different PublicationLocationIds after remap → no collision
    expect(merged[0]!.Slot).toBe(0);
    expect(merged[1]!.Slot).toBe(0);
  });

  it('should shift slot on collision (same publication, same slot)', () => {
    const { idMapA, idMapB } = setupMaps();
    // Both reference the same publication (LocationId 1 → newId 1, both mapped to pubLoc 2 → newId 2)
    const bmA = [makeBm({ BookmarkId: 1, LocationId: 1, PublicationLocationId: 2, Slot: 0, Title: 'Bookmark A' })];
    const bmB = [makeBm({ BookmarkId: 10, LocationId: 1, PublicationLocationId: 2, Slot: 0, Title: 'Bookmark B' })];

    const merged = mergeBookmarks(bmA, bmB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.Title).toBe('Bookmark A');
    expect(merged[0]!.Slot).toBe(0); // A keeps original slot
    expect(merged[1]!.Title).toBe('Bookmark B');
    expect(merged[1]!.Slot).toBe(1); // B shifted to next available
  });

  it('should deduplicate identical bookmarks (same pub, slot, title, snippet, location)', () => {
    const { idMapA, idMapB } = setupMaps();
    const bmA = [makeBm({ BookmarkId: 1, LocationId: 1, PublicationLocationId: 2, Slot: 0, Title: 'Same BM', Snippet: 'Same snippet' })];
    const bmB = [makeBm({ BookmarkId: 10, LocationId: 1, PublicationLocationId: 2, Slot: 0, Title: 'Same BM', Snippet: 'Same snippet' })];

    const merged = mergeBookmarks(bmA, bmB, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.Title).toBe('Same BM');
    // B's old ID should map to A's new ID
    expect(idMapB.get('Bookmark', 10)).toBe(idMapA.get('Bookmark', 1));
  });

  it('should handle multiple collisions on same publication', () => {
    const { idMapA, idMapB } = setupMaps();
    const bmA = [
      makeBm({ BookmarkId: 1, LocationId: 1, PublicationLocationId: 2, Slot: 0, Title: 'A first' }),
      makeBm({ BookmarkId: 2, LocationId: 1, PublicationLocationId: 2, Slot: 1, Title: 'A second' }),
    ];
    const bmB = [
      makeBm({ BookmarkId: 10, LocationId: 1, PublicationLocationId: 2, Slot: 0, Title: 'B first' }),
      makeBm({ BookmarkId: 11, LocationId: 1, PublicationLocationId: 2, Slot: 1, Title: 'B second' }),
    ];

    const merged = mergeBookmarks(bmA, bmB, idMapA, idMapB);

    expect(merged).toHaveLength(4);
    const slots = merged
      .filter((b) => b.PublicationLocationId === 2)
      .map((b) => b.Slot)
      .sort((a, b) => a - b);
    // All 4 should have unique slots
    expect(new Set(slots).size).toBe(4);
    expect(slots).toEqual([0, 1, 2, 3]);
  });

  it('should not shift when B slot does not collide', () => {
    const { idMapA, idMapB } = setupMaps();
    const bmA = [makeBm({ BookmarkId: 1, LocationId: 1, PublicationLocationId: 2, Slot: 0 })];
    const bmB = [makeBm({ BookmarkId: 10, LocationId: 1, PublicationLocationId: 2, Slot: 5 })];

    const merged = mergeBookmarks(bmA, bmB, idMapA, idMapB);

    expect(merged[0]!.Slot).toBe(0);
    expect(merged[1]!.Slot).toBe(5); // No collision, keep original
  });

  it('should assign sequential BookmarkIds', () => {
    const { idMapA, idMapB } = setupMaps();
    const bmA = [makeBm({ BookmarkId: 100, LocationId: 1, PublicationLocationId: 2 })];
    const bmB = [makeBm({ BookmarkId: 200, LocationId: 10, PublicationLocationId: 20 })];

    const merged = mergeBookmarks(bmA, bmB, idMapA, idMapB);

    expect(merged.map((b) => b.BookmarkId)).toEqual([1, 2]);
  });

  it('should handle empty sources', () => {
    const { idMapA, idMapB } = setupMaps();
    expect(mergeBookmarks([], [], idMapA, idMapB)).toHaveLength(0);
    expect(mergeBookmarks([makeBm({ BookmarkId: 1, LocationId: 1, PublicationLocationId: 2 })], [], idMapA, idMapB)).toHaveLength(1);
    expect(mergeBookmarks([], [makeBm({ BookmarkId: 10, LocationId: 10, PublicationLocationId: 20 })], idMapA, idMapB)).toHaveLength(1);
  });

  it('should preserve Snippet, BlockType, and BlockIdentifier', () => {
    const { idMapA, idMapB } = setupMaps();
    const bmA = [makeBm({ BookmarkId: 1, LocationId: 1, PublicationLocationId: 2, Snippet: 'Some text...', BlockType: 1, BlockIdentifier: 7 })];

    const merged = mergeBookmarks(bmA, [], idMapA, idMapB);

    expect(merged[0]!.Snippet).toBe('Some text...');
    expect(merged[0]!.BlockType).toBe(1);
    expect(merged[0]!.BlockIdentifier).toBe(7);
  });

  it('should update counter after merge', () => {
    const { idMapA, idMapB } = setupMaps();
    const bmA = [makeBm({ BookmarkId: 1, LocationId: 1, PublicationLocationId: 2 })];
    const bmB = [makeBm({ BookmarkId: 10, LocationId: 10, PublicationLocationId: 20 })];

    mergeBookmarks(bmA, bmB, idMapA, idMapB);

    expect(idMapA.getCounter('Bookmark')).toBe(3);
  });

  it('should populate ID mappings for both sources', () => {
    const { idMapA, idMapB } = setupMaps();
    const bmA = [makeBm({ BookmarkId: 5, LocationId: 1, PublicationLocationId: 2 })];
    const bmB = [makeBm({ BookmarkId: 15, LocationId: 10, PublicationLocationId: 20 })];

    mergeBookmarks(bmA, bmB, idMapA, idMapB);

    expect(idMapA.get('Bookmark', 5)).toBe(1);
    expect(idMapB.get('Bookmark', 15)).toBe(2);
  });
});
