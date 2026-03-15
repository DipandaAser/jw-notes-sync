import { describe, it, expect } from 'vitest';
import { mergeTags, mergeTagMaps, IdMap } from '../src/index.js';
import type { Tag, TagMap } from '../src/index.js';

function makeTag(overrides: Partial<Tag> & { TagId: number }): Tag {
  return {
    Type: 1,
    Name: 'Tag',
    ...overrides,
  };
}

function makeTagMap(overrides: Partial<TagMap> & { TagMapId: number; TagId: number }): TagMap {
  return {
    NoteId: null,
    LocationId: null,
    PlaylistItemId: null,
    Position: 0,
    ...overrides,
  };
}

function setupMaps(): { idMapA: IdMap; idMapB: IdMap } {
  const idMapA = new IdMap();
  const idMapB = new IdMap();
  return { idMapA, idMapB };
}

describe('mergeTags', () => {
  it('should keep unique tags from both sources', () => {
    const { idMapA, idMapB } = setupMaps();
    const tagsA = [makeTag({ TagId: 1, Type: 1, Name: 'Prophecy' })];
    const tagsB = [makeTag({ TagId: 10, Type: 1, Name: 'History' })];

    const merged = mergeTags(tagsA, tagsB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.Name).toBe('Prophecy');
    expect(merged[1]!.Name).toBe('History');
  });

  it('should deduplicate tags with same Type + Name', () => {
    const { idMapA, idMapB } = setupMaps();
    const tagsA = [makeTag({ TagId: 1, Type: 1, Name: 'Prophecy' })];
    const tagsB = [makeTag({ TagId: 10, Type: 1, Name: 'Prophecy' })];

    const merged = mergeTags(tagsA, tagsB, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.Name).toBe('Prophecy');
  });

  it('should keep tags with same Name but different Type', () => {
    const { idMapA, idMapB } = setupMaps();
    const tagsA = [makeTag({ TagId: 1, Type: 1, Name: 'Study' })];
    const tagsB = [makeTag({ TagId: 10, Type: 2, Name: 'Study' })];

    const merged = mergeTags(tagsA, tagsB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
  });

  it('should assign sequential TagIds', () => {
    const { idMapA, idMapB } = setupMaps();
    const tagsA = [
      makeTag({ TagId: 100, Type: 1, Name: 'Alpha' }),
      makeTag({ TagId: 200, Type: 1, Name: 'Beta' }),
    ];
    const tagsB = [makeTag({ TagId: 50, Type: 1, Name: 'Gamma' })];

    const merged = mergeTags(tagsA, tagsB, idMapA, idMapB);

    expect(merged.map((t) => t.TagId)).toEqual([1, 2, 3]);
  });

  it('should populate ID mappings for both sources', () => {
    const { idMapA, idMapB } = setupMaps();
    const tagsA = [makeTag({ TagId: 5, Type: 1, Name: 'Alpha' })];
    const tagsB = [makeTag({ TagId: 15, Type: 1, Name: 'Beta' })];

    mergeTags(tagsA, tagsB, idMapA, idMapB);

    expect(idMapA.get('Tag', 5)).toBe(1);
    expect(idMapB.get('Tag', 15)).toBe(2);
  });

  it('should map duplicate B tag to existing A tag ID', () => {
    const { idMapA, idMapB } = setupMaps();
    const tagsA = [makeTag({ TagId: 1, Type: 1, Name: 'Prophecy' })];
    const tagsB = [makeTag({ TagId: 10, Type: 1, Name: 'Prophecy' })];

    mergeTags(tagsA, tagsB, idMapA, idMapB);

    expect(idMapA.get('Tag', 1)).toBe(idMapB.get('Tag', 10));
  });

  it('should handle empty sources', () => {
    const { idMapA, idMapB } = setupMaps();
    expect(mergeTags([], [], idMapA, idMapB)).toHaveLength(0);
    expect(mergeTags([makeTag({ TagId: 1, Type: 1, Name: 'A' })], [], idMapA, idMapB)).toHaveLength(1);
  });

  it('should update counter after merge', () => {
    const { idMapA, idMapB } = setupMaps();
    const tagsA = [makeTag({ TagId: 1, Type: 1, Name: 'Alpha' })];
    const tagsB = [makeTag({ TagId: 10, Type: 1, Name: 'Beta' })];

    mergeTags(tagsA, tagsB, idMapA, idMapB);

    expect(idMapA.getCounter('Tag')).toBe(3);
  });
});

describe('mergeTagMaps', () => {
  function setupWithTags(): { idMapA: IdMap; idMapB: IdMap } {
    const idMapA = new IdMap();
    const idMapB = new IdMap();

    // Location mappings
    idMapA.set('Location', 1, 1);
    idMapA.set('Location', 2, 2);
    idMapB.set('Location', 10, 3);
    idMapB.set('Location', 1, 1);

    // Note mappings
    idMapA.set('Note', 1, 1);
    idMapA.set('Note', 2, 2);
    idMapB.set('Note', 10, 3);
    idMapB.set('Note', 1, 1);

    // Tag mappings
    idMapA.set('Tag', 1, 1);
    idMapA.set('Tag', 2, 2);
    idMapB.set('Tag', 10, 3);
    idMapB.set('Tag', 1, 1); // shared tag

    return { idMapA, idMapB };
  }

  it('should keep unique tag maps from both sources', () => {
    const { idMapA, idMapB } = setupWithTags();
    const tmA = [makeTagMap({ TagMapId: 1, TagId: 1, NoteId: 1 })];
    const tmB = [makeTagMap({ TagMapId: 10, TagId: 10, NoteId: 10 })];

    const merged = mergeTagMaps(tmA, tmB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
  });

  it('should remap TagId, NoteId, LocationId', () => {
    const { idMapA, idMapB } = setupWithTags();
    const tmA = [makeTagMap({ TagMapId: 1, TagId: 1, NoteId: 1 })];
    const tmB = [makeTagMap({ TagMapId: 10, TagId: 10, LocationId: 10 })];

    const merged = mergeTagMaps(tmA, tmB, idMapA, idMapB);

    expect(merged[0]!.TagId).toBe(1);
    expect(merged[0]!.NoteId).toBe(1);
    expect(merged[1]!.TagId).toBe(3);
    expect(merged[1]!.LocationId).toBe(3);
  });

  it('should deduplicate identical tag maps after remapping', () => {
    const { idMapA, idMapB } = setupWithTags();
    // Both map to TagId=1, NoteId=1 after remapping
    const tmA = [makeTagMap({ TagMapId: 1, TagId: 1, NoteId: 1 })];
    const tmB = [makeTagMap({ TagMapId: 10, TagId: 1, NoteId: 1 })];

    const merged = mergeTagMaps(tmA, tmB, idMapA, idMapB);

    expect(merged).toHaveLength(1);
  });

  it('should keep both when same tag maps to different notes', () => {
    const { idMapA, idMapB } = setupWithTags();
    const tmA = [makeTagMap({ TagMapId: 1, TagId: 1, NoteId: 1 })];
    const tmB = [makeTagMap({ TagMapId: 10, TagId: 1, NoteId: 10 })]; // NoteId 10→3

    const merged = mergeTagMaps(tmA, tmB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
  });

  it('should recalculate Position per TagId', () => {
    const { idMapA, idMapB } = setupWithTags();
    const tmA = [
      makeTagMap({ TagMapId: 1, TagId: 1, NoteId: 1, Position: 5 }),
      makeTagMap({ TagMapId: 2, TagId: 1, LocationId: 1, Position: 10 }),
    ];
    const tmB = [makeTagMap({ TagMapId: 10, TagId: 1, NoteId: 10, Position: 99 })]; // NoteId 10→3

    const merged = mergeTagMaps(tmA, tmB, idMapA, idMapB);

    expect(merged).toHaveLength(3);
    // All have TagId=1, positions should be 0, 1, 2
    const positions = merged.map((tm) => tm.Position).sort((a, b) => a - b);
    expect(positions).toEqual([0, 1, 2]);
  });

  it('should assign sequential TagMapIds', () => {
    const { idMapA, idMapB } = setupWithTags();
    const tmA = [
      makeTagMap({ TagMapId: 100, TagId: 1, NoteId: 1 }),
      makeTagMap({ TagMapId: 200, TagId: 2, NoteId: 2 }),
    ];
    const tmB = [makeTagMap({ TagMapId: 50, TagId: 10, NoteId: 10 })];

    const merged = mergeTagMaps(tmA, tmB, idMapA, idMapB);

    expect(merged.map((tm) => tm.TagMapId)).toEqual([1, 2, 3]);
  });

  it('should handle empty sources', () => {
    const { idMapA, idMapB } = setupWithTags();
    expect(mergeTagMaps([], [], idMapA, idMapB)).toHaveLength(0);
  });

  it('should handle null FK fields correctly', () => {
    const { idMapA, idMapB } = setupWithTags();
    const tmA = [makeTagMap({ TagMapId: 1, TagId: 1, NoteId: null, LocationId: null, PlaylistItemId: null })];

    const merged = mergeTagMaps(tmA, [], idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.NoteId).toBeNull();
    expect(merged[0]!.LocationId).toBeNull();
    expect(merged[0]!.PlaylistItemId).toBeNull();
  });

  it('should update counter after merge', () => {
    const { idMapA, idMapB } = setupWithTags();
    const tmA = [makeTagMap({ TagMapId: 1, TagId: 1, NoteId: 1 })];
    const tmB = [makeTagMap({ TagMapId: 10, TagId: 10, NoteId: 10 })];

    mergeTagMaps(tmA, tmB, idMapA, idMapB);

    expect(idMapA.getCounter('TagMap')).toBe(3);
  });

  it('should handle PlaylistItemId remapping', () => {
    const { idMapA, idMapB } = setupWithTags();
    idMapA.set('PlaylistItem', 1, 1);

    const tmA = [makeTagMap({ TagMapId: 1, TagId: 1, PlaylistItemId: 1 })];

    const merged = mergeTagMaps(tmA, [], idMapA, idMapB);

    expect(merged[0]!.PlaylistItemId).toBe(1);
  });
});
