import type { Bookmark } from './models.js';
import type { IdMap } from './id-map.js';

/**
 * Merge Bookmark tables from two databases.
 *
 * **Merge order: 5** — depends on Location (step 1).
 * `Location` mappings must exist in idMapA/idMapB before calling.
 * Populates `Bookmark` mappings (no downstream dependents currently).
 *
 * Strategy:
 * - Match by remapped PublicationLocationId + Slot
 * - Identical match → keep A's version
 * - Slot collision → keep both, shift B's bookmark to next available slot
 * - Unique → carry over with remapped LocationId and PublicationLocationId
 */
export function mergeBookmarks(
  bookmarksA: Bookmark[],
  bookmarksB: Bookmark[],
  idMapA: IdMap,
  idMapB: IdMap,
): Bookmark[] {
  const TABLE = 'Bookmark';
  const merged: Bookmark[] = [];
  let nextId = 1;

  // Track occupied slots per PublicationLocationId (using remapped IDs)
  const slotsByPub = new Map<number, Set<number>>();

  function occupySlot(pubLocId: number, slot: number): void {
    let slots = slotsByPub.get(pubLocId);
    if (!slots) {
      slots = new Set();
      slotsByPub.set(pubLocId, slots);
    }
    slots.add(slot);
  }

  function nextAvailableSlot(pubLocId: number): number {
    const slots = slotsByPub.get(pubLocId);
    if (!slots || slots.size === 0) return 0;
    let max = 0;
    for (const s of slots) {
      if (s > max) max = s;
    }
    return max + 1;
  }

  // Process A bookmarks first — they get priority on slots
  for (const bm of bookmarksA) {
    const newId = nextId++;
    const newLocId = idMapA.get('Location', bm.LocationId);
    const newPubLocId = idMapA.get('Location', bm.PublicationLocationId);

    merged.push({
      ...bm,
      BookmarkId: newId,
      LocationId: newLocId,
      PublicationLocationId: newPubLocId,
    });
    occupySlot(newPubLocId, bm.Slot);
    idMapA.set(TABLE, bm.BookmarkId, newId);
  }

  // Process B bookmarks — deduplicate identical, shift slot on collision
  for (const bm of bookmarksB) {
    const newLocId = idMapB.get('Location', bm.LocationId);
    const newPubLocId = idMapB.get('Location', bm.PublicationLocationId);

    let slot = bm.Slot;
    const slots = slotsByPub.get(newPubLocId);
    if (slots?.has(slot)) {
      // Check if it's actually the same bookmark (identical content)
      const existing = merged.find(
        (b) =>
          b.PublicationLocationId === newPubLocId &&
          b.Slot === slot &&
          b.Title === bm.Title &&
          b.Snippet === bm.Snippet &&
          b.LocationId === newLocId,
      );
      if (existing) {
        // Deduplicate — map B's old ID to the existing entry
        idMapB.set(TABLE, bm.BookmarkId, existing.BookmarkId);
        continue;
      }
      slot = nextAvailableSlot(newPubLocId);
    }

    const newId = nextId++;
    merged.push({
      ...bm,
      BookmarkId: newId,
      LocationId: newLocId,
      PublicationLocationId: newPubLocId,
      Slot: slot,
    });
    occupySlot(newPubLocId, slot);
    idMapB.set(TABLE, bm.BookmarkId, newId);
  }

  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return merged;
}
