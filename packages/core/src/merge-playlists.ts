import type {
  IndependentMedia,
  PlaylistItem,
  PlaylistItemAccuracy,
  PlaylistItemIndependentMediaMap,
  PlaylistItemLocationMap,
  PlaylistItemMarker,
  PlaylistItemMarkerBibleVerseMap,
  PlaylistItemMarkerParagraphMap,
} from './models.js';
import type { IdMap } from './id-map.js';

// ── IndependentMedia ────────────────────────────────────────

/**
 * Merge IndependentMedia tables from two databases.
 *
 * **Merge order: 9** — no FK dependencies.
 * Populates `IndependentMedia` mappings.
 *
 * Strategy: deduplicate by Hash — same hash = same file, keep one.
 * Different hash → keep both.
 */
export function mergeIndependentMedia(
  mediaA: IndependentMedia[],
  mediaB: IndependentMedia[],
  idMapA: IdMap,
  idMapB: IdMap,
): IndependentMedia[] {
  const TABLE = 'IndependentMedia';
  const merged: IndependentMedia[] = [];
  let nextId = 1;

  const seenByHash = new Map<string, number>(); // Hash → newId

  for (const m of mediaA) {
    const newId = nextId++;
    merged.push({ ...m, IndependentMediaId: newId });
    seenByHash.set(m.Hash, newId);
    idMapA.set(TABLE, m.IndependentMediaId, newId);
  }

  for (const m of mediaB) {
    const existingNewId = seenByHash.get(m.Hash);
    if (existingNewId !== undefined) {
      idMapB.set(TABLE, m.IndependentMediaId, existingNewId);
    } else {
      const newId = nextId++;
      merged.push({ ...m, IndependentMediaId: newId });
      seenByHash.set(m.Hash, newId);
      idMapB.set(TABLE, m.IndependentMediaId, newId);
    }
  }

  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return merged;
}

// ── PlaylistItemAccuracy ────────────────────────────────────

/**
 * Merge PlaylistItemAccuracy tables from two databases.
 *
 * **Merge order: 9** — no FK dependencies (reference/enum table).
 * Populates `PlaylistItemAccuracy` mappings.
 *
 * Strategy: deduplicate by Description.
 */
export function mergePlaylistItemAccuracy(
  accA: PlaylistItemAccuracy[],
  accB: PlaylistItemAccuracy[],
  idMapA: IdMap,
  idMapB: IdMap,
): PlaylistItemAccuracy[] {
  const TABLE = 'PlaylistItemAccuracy';
  const merged: PlaylistItemAccuracy[] = [];
  let nextId = 1;

  const seenByDesc = new Map<string, number>(); // Description → newId

  for (const a of accA) {
    const newId = nextId++;
    merged.push({ ...a, PlaylistItemAccuracyId: newId });
    seenByDesc.set(a.Description, newId);
    idMapA.set(TABLE, a.PlaylistItemAccuracyId, newId);
  }

  for (const a of accB) {
    const existingNewId = seenByDesc.get(a.Description);
    if (existingNewId !== undefined) {
      idMapB.set(TABLE, a.PlaylistItemAccuracyId, existingNewId);
    } else {
      const newId = nextId++;
      merged.push({ ...a, PlaylistItemAccuracyId: newId });
      seenByDesc.set(a.Description, newId);
      idMapB.set(TABLE, a.PlaylistItemAccuracyId, newId);
    }
  }

  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return merged;
}

// ── PlaylistItem ────────────────────────────────────────────

/**
 * Merge PlaylistItem tables from two databases.
 *
 * **Merge order: 10** — depends on PlaylistItemAccuracy (step 9).
 * Populates `PlaylistItem` mappings used by markers and join tables.
 *
 * Strategy: keep both — all items from both sources are preserved.
 * Remaps Accuracy FK.
 */
export function mergePlaylistItems(
  itemsA: PlaylistItem[],
  itemsB: PlaylistItem[],
  idMapA: IdMap,
  idMapB: IdMap,
): PlaylistItem[] {
  const TABLE = 'PlaylistItem';
  const merged: PlaylistItem[] = [];
  let nextId = 1;

  for (const item of itemsA) {
    const newId = nextId++;
    merged.push({
      ...item,
      PlaylistItemId: newId,
      Accuracy: idMapA.get('PlaylistItemAccuracy', item.Accuracy),
    });
    idMapA.set(TABLE, item.PlaylistItemId, newId);
  }

  for (const item of itemsB) {
    const newId = nextId++;
    merged.push({
      ...item,
      PlaylistItemId: newId,
      Accuracy: idMapB.get('PlaylistItemAccuracy', item.Accuracy),
    });
    idMapB.set(TABLE, item.PlaylistItemId, newId);
  }

  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return merged;
}

// ── PlaylistItemMarker ──────────────────────────────────────

/**
 * Merge PlaylistItemMarker tables from two databases.
 *
 * **Merge order: 11** — depends on PlaylistItem (step 10).
 * Populates `PlaylistItemMarker` mappings.
 *
 * Strategy: follow parent — keep all markers, remap PlaylistItemId.
 */
export function mergePlaylistItemMarkers(
  markersA: PlaylistItemMarker[],
  markersB: PlaylistItemMarker[],
  idMapA: IdMap,
  idMapB: IdMap,
): PlaylistItemMarker[] {
  const TABLE = 'PlaylistItemMarker';
  const merged: PlaylistItemMarker[] = [];
  let nextId = 1;

  for (const m of markersA) {
    const newId = nextId++;
    merged.push({
      ...m,
      PlaylistItemMarkerId: newId,
      PlaylistItemId: idMapA.get('PlaylistItem', m.PlaylistItemId),
    });
    idMapA.set(TABLE, m.PlaylistItemMarkerId, newId);
  }

  for (const m of markersB) {
    const newId = nextId++;
    merged.push({
      ...m,
      PlaylistItemMarkerId: newId,
      PlaylistItemId: idMapB.get('PlaylistItem', m.PlaylistItemId),
    });
    idMapB.set(TABLE, m.PlaylistItemMarkerId, newId);
  }

  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return merged;
}

// ── Join tables ─────────────────────────────────────────────

/**
 * Merge PlaylistItemLocationMap tables.
 *
 * **Merge order: 12** — depends on PlaylistItem (step 10), Location (step 1).
 * Remaps PlaylistItemId + LocationId.
 */
export function mergePlaylistItemLocationMaps(
  mapsA: PlaylistItemLocationMap[],
  mapsB: PlaylistItemLocationMap[],
  idMapA: IdMap,
  idMapB: IdMap,
): PlaylistItemLocationMap[] {
  const merged: PlaylistItemLocationMap[] = [];

  for (const m of mapsA) {
    merged.push({
      ...m,
      PlaylistItemId: idMapA.get('PlaylistItem', m.PlaylistItemId),
      LocationId: idMapA.get('Location', m.LocationId),
    });
  }

  for (const m of mapsB) {
    merged.push({
      ...m,
      PlaylistItemId: idMapB.get('PlaylistItem', m.PlaylistItemId),
      LocationId: idMapB.get('Location', m.LocationId),
    });
  }

  return merged;
}

/**
 * Merge PlaylistItemIndependentMediaMap tables.
 *
 * **Merge order: 12** — depends on PlaylistItem (step 10),
 * IndependentMedia (step 9).
 * Remaps PlaylistItemId + IndependentMediaId.
 */
export function mergePlaylistItemIndependentMediaMaps(
  mapsA: PlaylistItemIndependentMediaMap[],
  mapsB: PlaylistItemIndependentMediaMap[],
  idMapA: IdMap,
  idMapB: IdMap,
): PlaylistItemIndependentMediaMap[] {
  const merged: PlaylistItemIndependentMediaMap[] = [];

  for (const m of mapsA) {
    merged.push({
      ...m,
      PlaylistItemId: idMapA.get('PlaylistItem', m.PlaylistItemId),
      IndependentMediaId: idMapA.get('IndependentMedia', m.IndependentMediaId),
    });
  }

  for (const m of mapsB) {
    merged.push({
      ...m,
      PlaylistItemId: idMapB.get('PlaylistItem', m.PlaylistItemId),
      IndependentMediaId: idMapB.get('IndependentMedia', m.IndependentMediaId),
    });
  }

  return merged;
}

/**
 * Merge PlaylistItemMarkerBibleVerseMap tables.
 *
 * **Merge order: 13** — depends on PlaylistItemMarker (step 11).
 * Remaps PlaylistItemMarkerId.
 */
export function mergePlaylistItemMarkerBibleVerseMaps(
  mapsA: PlaylistItemMarkerBibleVerseMap[],
  mapsB: PlaylistItemMarkerBibleVerseMap[],
  idMapA: IdMap,
  idMapB: IdMap,
): PlaylistItemMarkerBibleVerseMap[] {
  const merged: PlaylistItemMarkerBibleVerseMap[] = [];

  for (const m of mapsA) {
    merged.push({
      ...m,
      PlaylistItemMarkerId: idMapA.get('PlaylistItemMarker', m.PlaylistItemMarkerId),
    });
  }

  for (const m of mapsB) {
    merged.push({
      ...m,
      PlaylistItemMarkerId: idMapB.get('PlaylistItemMarker', m.PlaylistItemMarkerId),
    });
  }

  return merged;
}

/**
 * Merge PlaylistItemMarkerParagraphMap tables.
 *
 * **Merge order: 13** — depends on PlaylistItemMarker (step 11).
 * Remaps PlaylistItemMarkerId.
 */
export function mergePlaylistItemMarkerParagraphMaps(
  mapsA: PlaylistItemMarkerParagraphMap[],
  mapsB: PlaylistItemMarkerParagraphMap[],
  idMapA: IdMap,
  idMapB: IdMap,
): PlaylistItemMarkerParagraphMap[] {
  const merged: PlaylistItemMarkerParagraphMap[] = [];

  for (const m of mapsA) {
    merged.push({
      ...m,
      PlaylistItemMarkerId: idMapA.get('PlaylistItemMarker', m.PlaylistItemMarkerId),
    });
  }

  for (const m of mapsB) {
    merged.push({
      ...m,
      PlaylistItemMarkerId: idMapB.get('PlaylistItemMarker', m.PlaylistItemMarkerId),
    });
  }

  return merged;
}
