import { describe, it, expect } from 'vitest';
import {
  mergeIndependentMedia,
  mergePlaylistItemAccuracy,
  mergePlaylistItems,
  mergePlaylistItemMarkers,
  mergePlaylistItemLocationMaps,
  mergePlaylistItemIndependentMediaMaps,
  mergePlaylistItemMarkerBibleVerseMaps,
  mergePlaylistItemMarkerParagraphMaps,
  IdMap,
} from '../src/index.js';
import type {
  IndependentMedia,
  PlaylistItem,
  PlaylistItemAccuracy,
  PlaylistItemIndependentMediaMap,
  PlaylistItemLocationMap,
  PlaylistItemMarker,
  PlaylistItemMarkerBibleVerseMap,
  PlaylistItemMarkerParagraphMap,
} from '../src/index.js';

// ── Helpers ─────────────────────────────────────────────────

function makeMedia(overrides: Partial<IndependentMedia> & { IndependentMediaId: number }): IndependentMedia {
  return {
    OriginalFilename: 'file.mp3',
    FilePath: '/media/file.mp3',
    MimeType: 'audio/mpeg',
    Hash: 'abc123',
    ...overrides,
  };
}

function makeAccuracy(overrides: Partial<PlaylistItemAccuracy> & { PlaylistItemAccuracyId: number }): PlaylistItemAccuracy {
  return {
    Description: 'Accurate',
    ...overrides,
  };
}

function makePlaylistItem(overrides: Partial<PlaylistItem> & { PlaylistItemId: number }): PlaylistItem {
  return {
    Label: 'Item',
    StartTrimOffsetTicks: null,
    EndTrimOffsetTicks: null,
    Accuracy: 1,
    EndAction: 0,
    ThumbnailFilePath: null,
    ...overrides,
  };
}

function makeMarker(overrides: Partial<PlaylistItemMarker> & { PlaylistItemMarkerId: number; PlaylistItemId: number }): PlaylistItemMarker {
  return {
    Label: 'Marker',
    StartTimeTicks: 0,
    DurationTicks: 1000,
    EndTransitionDurationTicks: 0,
    ...overrides,
  };
}

// ── IndependentMedia ────────────────────────────────────────

describe('mergeIndependentMedia', () => {
  it('should keep unique media from both sources', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const mediaA = [makeMedia({ IndependentMediaId: 1, Hash: 'aaa' })];
    const mediaB = [makeMedia({ IndependentMediaId: 10, Hash: 'bbb' })];

    const merged = mergeIndependentMedia(mediaA, mediaB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
  });

  it('should deduplicate by Hash', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const mediaA = [makeMedia({ IndependentMediaId: 1, Hash: 'same-hash' })];
    const mediaB = [makeMedia({ IndependentMediaId: 10, Hash: 'same-hash' })];

    const merged = mergeIndependentMedia(mediaA, mediaB, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(idMapA.get('IndependentMedia', 1)).toBe(idMapB.get('IndependentMedia', 10));
  });

  it('should keep both when same filename but different hash', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const mediaA = [makeMedia({ IndependentMediaId: 1, OriginalFilename: 'song.mp3', Hash: 'hash-a' })];
    const mediaB = [makeMedia({ IndependentMediaId: 10, OriginalFilename: 'song.mp3', Hash: 'hash-b' })];

    const merged = mergeIndependentMedia(mediaA, mediaB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
  });

  it('should assign sequential IDs', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const mediaA = [makeMedia({ IndependentMediaId: 100, Hash: 'a' })];
    const mediaB = [makeMedia({ IndependentMediaId: 200, Hash: 'b' })];

    const merged = mergeIndependentMedia(mediaA, mediaB, idMapA, idMapB);

    expect(merged.map((m) => m.IndependentMediaId)).toEqual([1, 2]);
  });

  it('should populate ID mappings', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const mediaA = [makeMedia({ IndependentMediaId: 5, Hash: 'a' })];
    const mediaB = [makeMedia({ IndependentMediaId: 15, Hash: 'b' })];

    mergeIndependentMedia(mediaA, mediaB, idMapA, idMapB);

    expect(idMapA.get('IndependentMedia', 5)).toBe(1);
    expect(idMapB.get('IndependentMedia', 15)).toBe(2);
  });

  it('should handle empty sources', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    expect(mergeIndependentMedia([], [], idMapA, idMapB)).toHaveLength(0);
  });

  it('should update counter', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    mergeIndependentMedia(
      [makeMedia({ IndependentMediaId: 1, Hash: 'a' })],
      [makeMedia({ IndependentMediaId: 10, Hash: 'b' })],
      idMapA,
      idMapB,
    );

    expect(idMapA.getCounter('IndependentMedia')).toBe(3);
  });
});

// ── PlaylistItemAccuracy ────────────────────────────────────

describe('mergePlaylistItemAccuracy', () => {
  it('should deduplicate by Description', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const accA = [makeAccuracy({ PlaylistItemAccuracyId: 1, Description: 'Accurate' })];
    const accB = [makeAccuracy({ PlaylistItemAccuracyId: 10, Description: 'Accurate' })];

    const merged = mergePlaylistItemAccuracy(accA, accB, idMapA, idMapB);

    expect(merged).toHaveLength(1);
    expect(idMapA.get('PlaylistItemAccuracy', 1)).toBe(idMapB.get('PlaylistItemAccuracy', 10));
  });

  it('should keep unique descriptions', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const accA = [makeAccuracy({ PlaylistItemAccuracyId: 1, Description: 'Accurate' })];
    const accB = [makeAccuracy({ PlaylistItemAccuracyId: 10, Description: 'Approximate' })];

    const merged = mergePlaylistItemAccuracy(accA, accB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
  });

  it('should assign sequential IDs and populate mappings', () => {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const accA = [makeAccuracy({ PlaylistItemAccuracyId: 50, Description: 'Accurate' })];
    const accB = [makeAccuracy({ PlaylistItemAccuracyId: 99, Description: 'Approximate' })];

    const merged = mergePlaylistItemAccuracy(accA, accB, idMapA, idMapB);

    expect(merged.map((a) => a.PlaylistItemAccuracyId)).toEqual([1, 2]);
    expect(idMapA.get('PlaylistItemAccuracy', 50)).toBe(1);
    expect(idMapB.get('PlaylistItemAccuracy', 99)).toBe(2);
  });
});

// ── PlaylistItem ────────────────────────────────────────────

describe('mergePlaylistItems', () => {
  function setupAccuracy(): { idMapA: IdMap; idMapB: IdMap } {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    idMapA.set('PlaylistItemAccuracy', 1, 1);
    idMapB.set('PlaylistItemAccuracy', 1, 1);
    idMapB.set('PlaylistItemAccuracy', 2, 2);
    return { idMapA, idMapB };
  }

  it('should keep all items from both sources', () => {
    const { idMapA, idMapB } = setupAccuracy();
    const itemsA = [makePlaylistItem({ PlaylistItemId: 1, Label: 'Song A' })];
    const itemsB = [makePlaylistItem({ PlaylistItemId: 10, Label: 'Song B' })];

    const merged = mergePlaylistItems(itemsA, itemsB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.Label).toBe('Song A');
    expect(merged[1]!.Label).toBe('Song B');
  });

  it('should remap Accuracy FK', () => {
    const { idMapA, idMapB } = setupAccuracy();
    const itemsA = [makePlaylistItem({ PlaylistItemId: 1, Accuracy: 1 })];
    const itemsB = [makePlaylistItem({ PlaylistItemId: 10, Accuracy: 2 })];

    const merged = mergePlaylistItems(itemsA, itemsB, idMapA, idMapB);

    expect(merged[0]!.Accuracy).toBe(1);
    expect(merged[1]!.Accuracy).toBe(2);
  });

  it('should assign sequential IDs', () => {
    const { idMapA, idMapB } = setupAccuracy();
    const itemsA = [makePlaylistItem({ PlaylistItemId: 100 })];
    const itemsB = [makePlaylistItem({ PlaylistItemId: 200 })];

    const merged = mergePlaylistItems(itemsA, itemsB, idMapA, idMapB);

    expect(merged.map((i) => i.PlaylistItemId)).toEqual([1, 2]);
  });

  it('should populate ID mappings', () => {
    const { idMapA, idMapB } = setupAccuracy();
    const itemsA = [makePlaylistItem({ PlaylistItemId: 5 })];
    const itemsB = [makePlaylistItem({ PlaylistItemId: 15 })];

    mergePlaylistItems(itemsA, itemsB, idMapA, idMapB);

    expect(idMapA.get('PlaylistItem', 5)).toBe(1);
    expect(idMapB.get('PlaylistItem', 15)).toBe(2);
  });

  it('should handle empty sources', () => {
    const { idMapA, idMapB } = setupAccuracy();
    expect(mergePlaylistItems([], [], idMapA, idMapB)).toHaveLength(0);
  });

  it('should preserve optional fields', () => {
    const { idMapA, idMapB } = setupAccuracy();
    const itemsA = [makePlaylistItem({
      PlaylistItemId: 1,
      StartTrimOffsetTicks: 500,
      EndTrimOffsetTicks: 9000,
      ThumbnailFilePath: '/thumb.jpg',
    })];

    const merged = mergePlaylistItems(itemsA, [], idMapA, idMapB);

    expect(merged[0]!.StartTrimOffsetTicks).toBe(500);
    expect(merged[0]!.EndTrimOffsetTicks).toBe(9000);
    expect(merged[0]!.ThumbnailFilePath).toBe('/thumb.jpg');
  });
});

// ── PlaylistItemMarker ──────────────────────────────────────

describe('mergePlaylistItemMarkers', () => {
  function setup(): { idMapA: IdMap; idMapB: IdMap } {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    idMapA.set('PlaylistItem', 1, 1);
    idMapA.set('PlaylistItem', 2, 2);
    idMapB.set('PlaylistItem', 10, 3);
    idMapB.set('PlaylistItem', 20, 4);
    return { idMapA, idMapB };
  }

  it('should keep all markers from both sources', () => {
    const { idMapA, idMapB } = setup();
    const markersA = [makeMarker({ PlaylistItemMarkerId: 1, PlaylistItemId: 1 })];
    const markersB = [makeMarker({ PlaylistItemMarkerId: 10, PlaylistItemId: 10 })];

    const merged = mergePlaylistItemMarkers(markersA, markersB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
  });

  it('should remap PlaylistItemId', () => {
    const { idMapA, idMapB } = setup();
    const markersA = [makeMarker({ PlaylistItemMarkerId: 1, PlaylistItemId: 1 })];
    const markersB = [makeMarker({ PlaylistItemMarkerId: 10, PlaylistItemId: 10 })];

    const merged = mergePlaylistItemMarkers(markersA, markersB, idMapA, idMapB);

    expect(merged[0]!.PlaylistItemId).toBe(1);
    expect(merged[1]!.PlaylistItemId).toBe(3);
  });

  it('should assign sequential IDs and populate mappings', () => {
    const { idMapA, idMapB } = setup();
    const markersA = [makeMarker({ PlaylistItemMarkerId: 50, PlaylistItemId: 1 })];
    const markersB = [makeMarker({ PlaylistItemMarkerId: 99, PlaylistItemId: 10 })];

    const merged = mergePlaylistItemMarkers(markersA, markersB, idMapA, idMapB);

    expect(merged.map((m) => m.PlaylistItemMarkerId)).toEqual([1, 2]);
    expect(idMapA.get('PlaylistItemMarker', 50)).toBe(1);
    expect(idMapB.get('PlaylistItemMarker', 99)).toBe(2);
  });

  it('should handle empty sources', () => {
    const { idMapA, idMapB } = setup();
    expect(mergePlaylistItemMarkers([], [], idMapA, idMapB)).toHaveLength(0);
  });
});

// ── PlaylistItemLocationMap ─────────────────────────────────

describe('mergePlaylistItemLocationMaps', () => {
  function setup(): { idMapA: IdMap; idMapB: IdMap } {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    idMapA.set('PlaylistItem', 1, 1);
    idMapA.set('Location', 1, 1);
    idMapB.set('PlaylistItem', 10, 2);
    idMapB.set('Location', 10, 3);
    return { idMapA, idMapB };
  }

  it('should keep all maps and remap FKs', () => {
    const { idMapA, idMapB } = setup();
    const mapsA: PlaylistItemLocationMap[] = [
      { PlaylistItemId: 1, LocationId: 1, MajorMultimediaType: 0, BaseDurationTicks: null },
    ];
    const mapsB: PlaylistItemLocationMap[] = [
      { PlaylistItemId: 10, LocationId: 10, MajorMultimediaType: 1, BaseDurationTicks: 5000 },
    ];

    const merged = mergePlaylistItemLocationMaps(mapsA, mapsB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.PlaylistItemId).toBe(1);
    expect(merged[0]!.LocationId).toBe(1);
    expect(merged[1]!.PlaylistItemId).toBe(2);
    expect(merged[1]!.LocationId).toBe(3);
  });

  it('should handle empty sources', () => {
    const { idMapA, idMapB } = setup();
    expect(mergePlaylistItemLocationMaps([], [], idMapA, idMapB)).toHaveLength(0);
  });
});

// ── PlaylistItemIndependentMediaMap ─────────────────────────

describe('mergePlaylistItemIndependentMediaMaps', () => {
  function setup(): { idMapA: IdMap; idMapB: IdMap } {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    idMapA.set('PlaylistItem', 1, 1);
    idMapA.set('IndependentMedia', 1, 1);
    idMapB.set('PlaylistItem', 10, 2);
    idMapB.set('IndependentMedia', 10, 3);
    return { idMapA, idMapB };
  }

  it('should keep all maps and remap FKs', () => {
    const { idMapA, idMapB } = setup();
    const mapsA: PlaylistItemIndependentMediaMap[] = [
      { PlaylistItemId: 1, IndependentMediaId: 1, DurationTicks: 1000 },
    ];
    const mapsB: PlaylistItemIndependentMediaMap[] = [
      { PlaylistItemId: 10, IndependentMediaId: 10, DurationTicks: 2000 },
    ];

    const merged = mergePlaylistItemIndependentMediaMaps(mapsA, mapsB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.PlaylistItemId).toBe(1);
    expect(merged[0]!.IndependentMediaId).toBe(1);
    expect(merged[1]!.PlaylistItemId).toBe(2);
    expect(merged[1]!.IndependentMediaId).toBe(3);
  });

  it('should handle empty sources', () => {
    const { idMapA, idMapB } = setup();
    expect(mergePlaylistItemIndependentMediaMaps([], [], idMapA, idMapB)).toHaveLength(0);
  });
});

// ── PlaylistItemMarkerBibleVerseMap ─────────────────────────

describe('mergePlaylistItemMarkerBibleVerseMaps', () => {
  function setup(): { idMapA: IdMap; idMapB: IdMap } {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    idMapA.set('PlaylistItemMarker', 1, 1);
    idMapB.set('PlaylistItemMarker', 10, 2);
    return { idMapA, idMapB };
  }

  it('should keep all maps and remap PlaylistItemMarkerId', () => {
    const { idMapA, idMapB } = setup();
    const mapsA: PlaylistItemMarkerBibleVerseMap[] = [{ PlaylistItemMarkerId: 1, VerseId: 1001 }];
    const mapsB: PlaylistItemMarkerBibleVerseMap[] = [{ PlaylistItemMarkerId: 10, VerseId: 2002 }];

    const merged = mergePlaylistItemMarkerBibleVerseMaps(mapsA, mapsB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.PlaylistItemMarkerId).toBe(1);
    expect(merged[0]!.VerseId).toBe(1001);
    expect(merged[1]!.PlaylistItemMarkerId).toBe(2);
    expect(merged[1]!.VerseId).toBe(2002);
  });

  it('should handle empty sources', () => {
    const { idMapA, idMapB } = setup();
    expect(mergePlaylistItemMarkerBibleVerseMaps([], [], idMapA, idMapB)).toHaveLength(0);
  });
});

// ── PlaylistItemMarkerParagraphMap ──────────────────────────

describe('mergePlaylistItemMarkerParagraphMaps', () => {
  function setup(): { idMapA: IdMap; idMapB: IdMap } {
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    idMapA.set('PlaylistItemMarker', 1, 1);
    idMapB.set('PlaylistItemMarker', 10, 2);
    return { idMapA, idMapB };
  }

  it('should keep all maps and remap PlaylistItemMarkerId', () => {
    const { idMapA, idMapB } = setup();
    const mapsA: PlaylistItemMarkerParagraphMap[] = [
      { PlaylistItemMarkerId: 1, MepsDocumentId: 100, ParagraphIndex: 3, MarkerIndexWithinParagraph: 0 },
    ];
    const mapsB: PlaylistItemMarkerParagraphMap[] = [
      { PlaylistItemMarkerId: 10, MepsDocumentId: 200, ParagraphIndex: 5, MarkerIndexWithinParagraph: 1 },
    ];

    const merged = mergePlaylistItemMarkerParagraphMaps(mapsA, mapsB, idMapA, idMapB);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.PlaylistItemMarkerId).toBe(1);
    expect(merged[0]!.MepsDocumentId).toBe(100);
    expect(merged[1]!.PlaylistItemMarkerId).toBe(2);
    expect(merged[1]!.MepsDocumentId).toBe(200);
  });

  it('should handle empty sources', () => {
    const { idMapA, idMapB } = setup();
    expect(mergePlaylistItemMarkerParagraphMaps([], [], idMapA, idMapB)).toHaveLength(0);
  });
});
