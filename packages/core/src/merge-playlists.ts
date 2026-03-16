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
 * Build a natural key for PlaylistItem deduplication.
 * Label + Accuracy + EndAction uniquely identifies a playlist item across devices.
 */
function playlistItemNaturalKey(item: PlaylistItem): string {
  return `${item.Label}|${item.Accuracy}|${item.EndAction}|${item.ThumbnailFilePath ?? ''}`;
}

/**
 * Merge PlaylistItem tables from two databases.
 *
 * **Merge order: 10** — depends on PlaylistItemAccuracy (step 9).
 * Populates `PlaylistItem` mappings used by markers and join tables.
 *
 * Strategy: deduplicate by natural key (Label + Accuracy + EndAction + ThumbnailFilePath).
 * Same item on both devices → keep one, map both old IDs to the same new ID.
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

  const seen = new Map<string, number>(); // naturalKey → newId

  for (const item of itemsA) {
    const accuracy = idMapA.tryGet('PlaylistItemAccuracy', item.Accuracy);
    if (accuracy === undefined) continue; // orphaned row — skip
    const newId = nextId++;
    const key = playlistItemNaturalKey(item);
    merged.push({ ...item, PlaylistItemId: newId, Accuracy: accuracy });
    seen.set(key, newId);
    idMapA.set(TABLE, item.PlaylistItemId, newId);
  }

  for (const item of itemsB) {
    const accuracy = idMapB.tryGet('PlaylistItemAccuracy', item.Accuracy);
    if (accuracy === undefined) continue; // orphaned row — skip
    const key = playlistItemNaturalKey(item);
    const existingNewId = seen.get(key);

    if (existingNewId !== undefined) {
      // Duplicate — map to the existing entry
      idMapB.set(TABLE, item.PlaylistItemId, existingNewId);
    } else {
      const newId = nextId++;
      merged.push({ ...item, PlaylistItemId: newId, Accuracy: accuracy });
      seen.set(key, newId);
      idMapB.set(TABLE, item.PlaylistItemId, newId);
    }
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
    const parentId = idMapA.tryGet('PlaylistItem', m.PlaylistItemId);
    if (parentId === undefined) continue;
    const newId = nextId++;
    merged.push({ ...m, PlaylistItemMarkerId: newId, PlaylistItemId: parentId });
    idMapA.set(TABLE, m.PlaylistItemMarkerId, newId);
  }

  for (const m of markersB) {
    const parentId = idMapB.tryGet('PlaylistItem', m.PlaylistItemId);
    if (parentId === undefined) continue;
    const newId = nextId++;
    merged.push({ ...m, PlaylistItemMarkerId: newId, PlaylistItemId: parentId });
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
  const seen = new Set<string>(); // "PlaylistItemId|LocationId"

  for (const m of mapsA) {
    const pid = idMapA.tryGet('PlaylistItem', m.PlaylistItemId);
    const lid = idMapA.tryGet('Location', m.LocationId);
    if (pid === undefined || lid === undefined) continue;
    const key = `${pid}|${lid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...m, PlaylistItemId: pid, LocationId: lid });
  }

  for (const m of mapsB) {
    const pid = idMapB.tryGet('PlaylistItem', m.PlaylistItemId);
    const lid = idMapB.tryGet('Location', m.LocationId);
    if (pid === undefined || lid === undefined) continue;
    const key = `${pid}|${lid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...m, PlaylistItemId: pid, LocationId: lid });
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
  const seen = new Set<string>(); // "PlaylistItemId|IndependentMediaId"

  for (const m of mapsA) {
    const pid = idMapA.tryGet('PlaylistItem', m.PlaylistItemId);
    const mid = idMapA.tryGet('IndependentMedia', m.IndependentMediaId);
    if (pid === undefined || mid === undefined) continue;
    const key = `${pid}|${mid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...m, PlaylistItemId: pid, IndependentMediaId: mid });
  }

  for (const m of mapsB) {
    const pid = idMapB.tryGet('PlaylistItem', m.PlaylistItemId);
    const mid = idMapB.tryGet('IndependentMedia', m.IndependentMediaId);
    if (pid === undefined || mid === undefined) continue;
    const key = `${pid}|${mid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...m, PlaylistItemId: pid, IndependentMediaId: mid });
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
    const mid = idMapA.tryGet('PlaylistItemMarker', m.PlaylistItemMarkerId);
    if (mid === undefined) continue;
    merged.push({ ...m, PlaylistItemMarkerId: mid });
  }

  for (const m of mapsB) {
    const mid = idMapB.tryGet('PlaylistItemMarker', m.PlaylistItemMarkerId);
    if (mid === undefined) continue;
    merged.push({ ...m, PlaylistItemMarkerId: mid });
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
    const mid = idMapA.tryGet('PlaylistItemMarker', m.PlaylistItemMarkerId);
    if (mid === undefined) continue;
    merged.push({ ...m, PlaylistItemMarkerId: mid });
  }

  for (const m of mapsB) {
    const mid = idMapB.tryGet('PlaylistItemMarker', m.PlaylistItemMarkerId);
    if (mid === undefined) continue;
    merged.push({ ...m, PlaylistItemMarkerId: mid });
  }

  return merged;
}
