import type { Location } from './models.js';
import type { IdMap } from './id-map.js';

/**
 * Build a natural key for Location deduplication.
 *
 * The natural key uses the two UNIQUE constraints from the schema:
 * - (BookNumber, ChapterNumber, KeySymbol, MepsLanguage, Type)
 * - (KeySymbol, IssueTagNumber, MepsLanguage, DocumentId, Track, Type)
 *
 * We combine all fields into a single composite key string. Two Locations
 * with the same natural key represent the same publication/chapter reference.
 */
export function locationNaturalKey(loc: Location): string {
  return [
    loc.BookNumber ?? '',
    loc.ChapterNumber ?? '',
    loc.KeySymbol ?? '',
    loc.MepsLanguage ?? '',
    loc.Type,
    loc.IssueTagNumber,
    loc.DocumentId ?? '',
    loc.Track ?? '',
  ].join('|');
}

export interface MergeLocationsResult {
  merged: Location[];
  idMapA: IdMap;
  idMapB: IdMap;
}

/**
 * Merge Location tables from two databases.
 *
 * **Merge order: 1 (root)** — no FK dependencies. Must run before all other merges.
 * Populates `Location` mappings in both IdMaps that downstream merges depend on:
 * UserMark, Note, Bookmark, TagMap, InputField, PlaylistItemLocationMap.
 *
 * Strategy: match by natural key, keep non-null Title, assign new sequential IDs.
 *
 * - Matching locations → single entry with non-null Title preferred
 * - Unique to A or B → carried over with new ID
 */
export function mergeLocations(
  locationsA: Location[],
  locationsB: Location[],
  idMapA: IdMap,
  idMapB: IdMap,
): Location[] {
  const TABLE = 'Location';
  const merged: Location[] = [];
  let nextId = 1;

  // Index B locations by natural key for fast lookup
  const bByKey = new Map<string, Location>();
  for (const loc of locationsB) {
    bByKey.set(locationNaturalKey(loc), loc);
  }

  const matchedBIds = new Set<number>();

  // Process A locations
  for (const locA of locationsA) {
    const key = locationNaturalKey(locA);
    const locB = bByKey.get(key);

    const newId = nextId++;

    if (locB) {
      // Match found — merge, preferring non-null Title
      matchedBIds.add(locB.LocationId);
      const title = locA.Title ?? locB.Title;

      merged.push({ ...locA, LocationId: newId, Title: title });
      idMapA.set(TABLE, locA.LocationId, newId);
      idMapB.set(TABLE, locB.LocationId, newId);
    } else {
      // Unique to A
      merged.push({ ...locA, LocationId: newId });
      idMapA.set(TABLE, locA.LocationId, newId);
    }
  }

  // Process B locations that didn't match
  for (const locB of locationsB) {
    if (!matchedBIds.has(locB.LocationId)) {
      const newId = nextId++;
      merged.push({ ...locB, LocationId: newId });
      idMapB.set(TABLE, locB.LocationId, newId);
    }
  }

  // Update counter for downstream use
  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return merged;
}
