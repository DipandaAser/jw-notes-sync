import type { Tag, TagMap } from './models.js';
import type { IdMap } from './id-map.js';

/**
 * Build a natural key for Tag deduplication.
 */
function tagNaturalKey(tag: Tag): string {
  return `${tag.Type}|${tag.Name}`;
}

/**
 * Merge Tag tables from two databases.
 *
 * **Merge order: 6** — no FK dependencies.
 * Populates `Tag` mappings used by TagMap (step 7).
 *
 * Strategy: union — deduplicate by Type + Name, assign new sequential IDs.
 */
export function mergeTags(
  tagsA: Tag[],
  tagsB: Tag[],
  idMapA: IdMap,
  idMapB: IdMap,
): Tag[] {
  const TABLE = 'Tag';
  const merged: Tag[] = [];
  let nextId = 1;

  // Index by natural key to deduplicate
  const seen = new Map<string, number>(); // naturalKey → newId

  for (const tag of tagsA) {
    const key = tagNaturalKey(tag);
    const newId = nextId++;
    merged.push({ ...tag, TagId: newId });
    seen.set(key, newId);
    idMapA.set(TABLE, tag.TagId, newId);
  }

  for (const tag of tagsB) {
    const key = tagNaturalKey(tag);
    const existingNewId = seen.get(key);

    if (existingNewId !== undefined) {
      // Duplicate — map to the existing entry
      idMapB.set(TABLE, tag.TagId, existingNewId);
    } else {
      const newId = nextId++;
      merged.push({ ...tag, TagId: newId });
      seen.set(key, newId);
      idMapB.set(TABLE, tag.TagId, newId);
    }
  }

  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return merged;
}

/**
 * Build a dedup key for a TagMap entry (after FK remapping).
 * Exactly one of NoteId/LocationId/PlaylistItemId is non-null.
 */
function tagMapDedupeKey(tm: TagMap): string {
  return `${tm.TagId}|${tm.NoteId ?? ''}|${tm.LocationId ?? ''}|${tm.PlaylistItemId ?? ''}`;
}

/**
 * Merge TagMap tables from two databases.
 *
 * **Merge order: 7** — depends on Tag (step 6), Note (step 3),
 * Location (step 1), PlaylistItem (step 10).
 * All parent mappings must exist in idMapA/idMapB before calling.
 *
 * Strategy: union — keep all associations, deduplicate after remapping,
 * recalculate Position values per TagId.
 */
export function mergeTagMaps(
  tagMapsA: TagMap[],
  tagMapsB: TagMap[],
  idMapA: IdMap,
  idMapB: IdMap,
): TagMap[] {
  const TABLE = 'TagMap';

  // Collect all remapped entries, deduplicating
  const seen = new Map<string, number>(); // dedup key → index in deduped
  const deduped: TagMap[] = [];
  // Track original IDs and their idMaps for later mapping
  const origins: { oldId: number; idMap: IdMap }[][] = [];

  function processEntry(tm: TagMap, idMap: IdMap): void {
    const remapped: TagMap = {
      ...tm,
      TagMapId: 0, // placeholder, assigned later
      TagId: idMap.get('Tag', tm.TagId),
      NoteId: tm.NoteId !== null ? idMap.get('Note', tm.NoteId) : null,
      LocationId: tm.LocationId !== null ? idMap.get('Location', tm.LocationId) : null,
      PlaylistItemId:
        tm.PlaylistItemId !== null ? (idMap.tryGet('PlaylistItem', tm.PlaylistItemId) ?? null) : null,
      Position: 0, // recalculated below
    };

    const key = tagMapDedupeKey(remapped);
    const existingIdx = seen.get(key);
    if (existingIdx !== undefined) {
      // Duplicate — track origin so we can map old ID later
      origins[existingIdx]!.push({ oldId: tm.TagMapId, idMap });
    } else {
      const idx = deduped.length;
      seen.set(key, idx);
      deduped.push(remapped);
      origins.push([{ oldId: tm.TagMapId, idMap }]);
    }
  }

  for (const tm of tagMapsA) {
    processEntry(tm, idMapA);
  }
  for (const tm of tagMapsB) {
    processEntry(tm, idMapB);
  }

  // Recalculate Position per TagId (0-indexed, sequential)
  const positionByTag = new Map<number, number>();
  const merged: TagMap[] = [];
  let nextId = 1;

  for (let i = 0; i < deduped.length; i++) {
    const tm = deduped[i]!;
    const pos = positionByTag.get(tm.TagId) ?? 0;
    positionByTag.set(tm.TagId, pos + 1);

    const newId = nextId++;
    merged.push({ ...tm, TagMapId: newId, Position: pos });

    // Map all original IDs (including duplicates) to this new ID
    for (const origin of origins[i]!) {
      origin.idMap.set(TABLE, origin.oldId, newId);
    }
  }

  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return merged;
}
