import { describe, it, expect } from 'vitest';
import { mergeNotes, IdMap } from '../src/index.js';
import type { Note, MergeNotesOptions } from '../src/index.js';

const opts: MergeNotesOptions = {
  deviceNameA: 'Google Pixel 6a',
  deviceNameB: 'iPad Air',
};

function makeNote(overrides: Partial<Note> & { NoteId: number; Guid: string }): Note {
  return {
    UserMarkId: null,
    LocationId: null,
    Title: null,
    Content: null,
    LastModified: '2026-01-15T10:00:00Z',
    Created: '2026-01-01T08:00:00Z',
    BlockType: 0,
    BlockIdentifier: null,
    ...overrides,
  };
}

function setupIdMaps(): { idMapA: IdMap; idMapB: IdMap } {
  const idMapA = new IdMap();
  const idMapB = new IdMap();
  // Pre-populate Location and UserMark mappings so remapping works
  idMapA.set('Location', 1, 1);
  idMapA.set('Location', 2, 2);
  idMapA.set('UserMark', 1, 1);
  idMapA.set('UserMark', 2, 2);
  idMapB.set('Location', 10, 3);
  idMapB.set('Location', 20, 4);
  idMapB.set('UserMark', 10, 3);
  idMapB.set('UserMark', 20, 4);
  return { idMapA, idMapB };
}

describe('mergeNotes', () => {
  it('should keep unique notes from both sources', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'aaa', LocationId: 1, Content: 'Note A' })];
    const notesB = [makeNote({ NoteId: 10, Guid: 'bbb', LocationId: 10, Content: 'Note B' })];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.Guid).toBe('aaa');
    expect(merged[0]!.Content).toBe('Note A');
    expect(merged[1]!.Guid).toBe('bbb');
    expect(merged[1]!.Content).toBe('Note B');
  });

  it('should remap LocationId for unique notes', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'aaa', LocationId: 1 })];
    const notesB = [makeNote({ NoteId: 10, Guid: 'bbb', LocationId: 10 })];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged[0]!.LocationId).toBe(1); // idMapA: 1→1
    expect(merged[1]!.LocationId).toBe(3); // idMapB: 10→3
  });

  it('should remap UserMarkId for unique notes', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'aaa', UserMarkId: 1 })];
    const notesB = [makeNote({ NoteId: 10, Guid: 'bbb', UserMarkId: 10 })];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged[0]!.UserMarkId).toBe(1); // idMapA: 1→1
    expect(merged[1]!.UserMarkId).toBe(3); // idMapB: 10→3
  });

  it('should keep null FKs as null', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'aaa', LocationId: null, UserMarkId: null })];

    const merged = mergeNotes(notesA, [], idMapA, idMapB, opts);

    expect(merged[0]!.LocationId).toBeNull();
    expect(merged[0]!.UserMarkId).toBeNull();
  });

  it('should deduplicate identical notes (same Guid, same content)', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'shared', LocationId: 1, Content: 'Same content', Title: 'Same title' })];
    const notesB = [makeNote({ NoteId: 10, Guid: 'shared', LocationId: 10, Content: 'Same content', Title: 'Same title' })];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.Content).toBe('Same content');
    expect(merged[0]!.Title).toBe('Same title');
  });

  it('should map both old IDs to the same new ID for identical notes', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'shared', LocationId: 1, Content: 'Same' })];
    const notesB = [makeNote({ NoteId: 10, Guid: 'shared', LocationId: 10, Content: 'Same' })];

    mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(idMapA.get('Note', 1)).toBe(idMapB.get('Note', 10));
  });

  it('should concatenate conflicting notes with device headers', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({
      NoteId: 1,
      Guid: 'conflict',
      LocationId: 1,
      Content: 'Version A',
      LastModified: '2026-02-01T10:00:00Z',
    })];
    const notesB = [makeNote({
      NoteId: 10,
      Guid: 'conflict',
      LocationId: 10,
      Content: 'Version B',
      LastModified: '2026-02-05T10:00:00Z',
    })];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.Content).toContain('[Google Pixel 6a — 2026-02-01T10:00:00Z]');
    expect(merged[0]!.Content).toContain('Version A');
    expect(merged[0]!.Content).toContain('---');
    expect(merged[0]!.Content).toContain('[iPad Air — 2026-02-05T10:00:00Z]');
    expect(merged[0]!.Content).toContain('Version B');
  });

  it('should use earliest Created and latest LastModified for matched notes', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({
      NoteId: 1,
      Guid: 'shared',
      LocationId: 1,
      Content: 'Same',
      Created: '2026-01-05T08:00:00Z',
      LastModified: '2026-02-01T10:00:00Z',
    })];
    const notesB = [makeNote({
      NoteId: 10,
      Guid: 'shared',
      LocationId: 10,
      Content: 'Same',
      Created: '2026-01-01T08:00:00Z',
      LastModified: '2026-03-01T10:00:00Z',
    })];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged[0]!.Created).toBe('2026-01-01T08:00:00Z');
    expect(merged[0]!.LastModified).toBe('2026-03-01T10:00:00Z');
  });

  it('should handle notes with null content', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'nullA', LocationId: 1, Content: null })];
    const notesB = [makeNote({ NoteId: 10, Guid: 'nullB', LocationId: 10, Content: null })];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.Content).toBeNull();
    expect(merged[1]!.Content).toBeNull();
  });

  it('should concatenate when one has null content and other has content', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'mixed', LocationId: 1, Content: null })];
    const notesB = [makeNote({ NoteId: 10, Guid: 'mixed', LocationId: 10, Content: 'Has content' })];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged).toHaveLength(1);
    // Content differs (null vs string) → concatenation
    expect(merged[0]!.Content).toContain('Has content');
  });

  it('should merge titles: prefer non-null', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'title-test', LocationId: 1, Title: null, Content: 'A' })];
    const notesB = [makeNote({ NoteId: 10, Guid: 'title-test', LocationId: 10, Title: 'My Title', Content: 'B' })];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged[0]!.Title).toBe('My Title');
  });

  it('should merge titles: concatenate when both differ', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'title-test', LocationId: 1, Title: 'Title A', Content: 'A' })];
    const notesB = [makeNote({ NoteId: 10, Guid: 'title-test', LocationId: 10, Title: 'Title B', Content: 'B' })];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged[0]!.Title).toBe('Title A / Title B');
  });

  it('should assign sequential IDs', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [
      makeNote({ NoteId: 100, Guid: 'a1', LocationId: 1 }),
      makeNote({ NoteId: 200, Guid: 'a2', LocationId: 2 }),
    ];
    const notesB = [
      makeNote({ NoteId: 50, Guid: 'b1', LocationId: 10 }),
    ];

    const merged = mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(merged.map((n) => n.NoteId)).toEqual([1, 2, 3]);
  });

  it('should handle both sources empty', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const merged = mergeNotes([], [], idMapA, idMapB, opts);
    expect(merged).toHaveLength(0);
  });

  it('should preserve BlockType and BlockIdentifier', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'block', LocationId: 1, BlockType: 1, BlockIdentifier: 42 })];

    const merged = mergeNotes(notesA, [], idMapA, idMapB, opts);

    expect(merged[0]!.BlockType).toBe(1);
    expect(merged[0]!.BlockIdentifier).toBe(42);
  });

  it('should update Note ID counter after merge', () => {
    const { idMapA, idMapB } = setupIdMaps();
    const notesA = [makeNote({ NoteId: 1, Guid: 'a1', LocationId: 1 })];
    const notesB = [makeNote({ NoteId: 10, Guid: 'b1', LocationId: 10 })];

    mergeNotes(notesA, notesB, idMapA, idMapB, opts);

    expect(idMapA.getCounter('Note')).toBe(3);
  });
});
