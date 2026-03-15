import type { Note } from './models.js';
import type { IdMap } from './id-map.js';

const SEPARATOR = '\n\n---\n\n';

/**
 * Remap a Note's foreign keys using the provided IdMap.
 */
function remapNote(note: Note, newId: number, idMap: IdMap): Note {
  return {
    ...note,
    NoteId: newId,
    LocationId: note.LocationId !== null ? idMap.get('Location', note.LocationId) : null,
    UserMarkId: note.UserMarkId !== null ? idMap.get('UserMark', note.UserMarkId) : null,
  };
}

/**
 * Format a concatenated note from two conflicting versions.
 */
function concatenateContent(
  contentA: string | null,
  deviceA: string,
  dateA: string,
  contentB: string | null,
  deviceB: string,
  dateB: string,
): string {
  const headerA = `[${deviceA} — ${dateA}]`;
  const headerB = `[${deviceB} — ${dateB}]`;
  const bodyA = contentA ?? '';
  const bodyB = contentB ?? '';
  return `${headerA}\n${bodyA}${SEPARATOR}${headerB}\n${bodyB}`;
}

export interface MergeNotesOptions {
  deviceNameA: string;
  deviceNameB: string;
}

/**
 * Merge Note tables from two databases.
 *
 * **Merge order: 3** — depends on Location (step 1) and UserMark (step 2).
 * Both `Location` and `UserMark` mappings must exist in idMapA/idMapB before calling.
 * Populates `Note` mappings used by TagMap (step 7).
 *
 * Strategy:
 * - Match by Guid
 * - Identical content → keep one, remap FKs from A
 * - Different content → concatenate with device/date headers
 * - Unique notes → keep as-is with remapped FKs
 * - Created = earliest of the two, LastModified = latest of the two
 */
export function mergeNotes(
  notesA: Note[],
  notesB: Note[],
  idMapA: IdMap,
  idMapB: IdMap,
  options: MergeNotesOptions,
): Note[] {
  const TABLE = 'Note';
  const merged: Note[] = [];
  let nextId = 1;

  // Index B notes by Guid
  const bByGuid = new Map<string, Note>();
  for (const note of notesB) {
    bByGuid.set(note.Guid, note);
  }

  const matchedBGuids = new Set<string>();

  // Process A notes
  for (const noteA of notesA) {
    const noteB = bByGuid.get(noteA.Guid);
    const newId = nextId++;

    if (noteB) {
      matchedBGuids.add(noteB.Guid);

      // Pick earliest Created, latest LastModified
      const created = noteA.Created <= noteB.Created ? noteA.Created : noteB.Created;
      const lastModified =
        noteA.LastModified >= noteB.LastModified ? noteA.LastModified : noteB.LastModified;

      const contentMatch =
        noteA.Content === noteB.Content && noteA.Title === noteB.Title;

      if (contentMatch) {
        // Identical — keep A's version with remapped FKs
        const remapped = remapNote(noteA, newId, idMapA);
        merged.push({ ...remapped, Created: created, LastModified: lastModified });
      } else {
        // Conflict — concatenate
        const content = concatenateContent(
          noteA.Content,
          options.deviceNameA,
          noteA.LastModified,
          noteB.Content,
          options.deviceNameB,
          noteB.LastModified,
        );

        // Merge titles: prefer non-null, or concatenate if both differ
        let title: string | null;
        if (noteA.Title === noteB.Title) {
          title = noteA.Title;
        } else if (noteA.Title === null) {
          title = noteB.Title;
        } else if (noteB.Title === null) {
          title = noteA.Title;
        } else {
          title = `${noteA.Title} / ${noteB.Title}`;
        }

        const remapped = remapNote(noteA, newId, idMapA);
        merged.push({
          ...remapped,
          Title: title,
          Content: content,
          Created: created,
          LastModified: lastModified,
        });
      }

      idMapA.set(TABLE, noteA.NoteId, newId);
      idMapB.set(TABLE, noteB.NoteId, newId);
    } else {
      // Unique to A
      const remapped = remapNote(noteA, newId, idMapA);
      merged.push(remapped);
      idMapA.set(TABLE, noteA.NoteId, newId);
    }
  }

  // Process B notes that didn't match
  for (const noteB of notesB) {
    if (!matchedBGuids.has(noteB.Guid)) {
      const newId = nextId++;
      const remapped = remapNote(noteB, newId, idMapB);
      merged.push(remapped);
      idMapB.set(TABLE, noteB.NoteId, newId);
    }
  }

  // Update counters
  idMapA.setCounter(TABLE, nextId);
  idMapB.setCounter(TABLE, nextId);

  return merged;
}
