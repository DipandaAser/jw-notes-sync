import {
  IdMap,
  mergeLocations,
  mergeUserMarks,
  mergeBlockRanges,
  mergeNotes,
  mergeBookmarks,
  mergeTags,
  mergeTagMaps,
  mergeInputFields,
  mergeIndependentMedia,
  mergePlaylistItemAccuracy,
  mergePlaylistItems,
  mergePlaylistItemMarkers,
  mergePlaylistItemLocationMaps,
  mergePlaylistItemIndependentMediaMaps,
  mergePlaylistItemMarkerBibleVerseMaps,
  mergePlaylistItemMarkerParagraphMaps,
  buildArchive,
  type DatabaseContents,
  type JWLibraryArchive,
} from '@jw-notes-sync/core';
import { webAdapter } from '$lib/adapter';
import { appState, type MergeResult } from '$lib/stores/app.svelte';

const MERGE_STEPS = [
  'Locations',
  'Surlignages',
  'Notes',
  'Signets',
  'Étiquettes',
  'Formulaires',
  'Playlists',
  'Exportation',
];

function updateProgress(stepIndex: number) {
  const percent = Math.round(((stepIndex + 1) / MERGE_STEPS.length) * 100);
  appState.mergeProgress = {
    step: MERGE_STEPS[stepIndex]!,
    percent,
    steps: MERGE_STEPS.map((name, i) => ({
      name,
      status: i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'pending',
    })),
  };
}

export async function runMerge(archiveA: JWLibraryArchive, archiveB: JWLibraryArchive): Promise<void> {
  appState.mergeStatus = 'merging';
  appState.mergeError = null;

  try {
    const a = archiveA.database;
    const b = archiveB.database;
    const idMapA = new IdMap();
    const idMapB = new IdMap();
    const deviceNameA = archiveA.manifest.userDataBackup.deviceName;
    const deviceNameB = archiveB.manifest.userDataBackup.deviceName;

    // Step 0: Locations
    updateProgress(0);
    const locations = mergeLocations(a.locations, b.locations, idMapA, idMapB);

    // Step 1: UserMarks + BlockRanges
    updateProgress(1);
    const { merged: userMarks, winners } = mergeUserMarks(a.userMarks, b.userMarks, idMapA, idMapB);
    const blockRanges = mergeBlockRanges(a.blockRanges, b.blockRanges, idMapA, idMapB, winners);

    // Step 2: Notes
    updateProgress(2);
    const notes = mergeNotes(a.notes, b.notes, idMapA, idMapB, { deviceNameA, deviceNameB });

    // Step 3: Bookmarks
    updateProgress(3);
    const bookmarks = mergeBookmarks(a.bookmarks, b.bookmarks, idMapA, idMapB);

    // Step 4: Tags + TagMaps
    updateProgress(4);
    const tags = mergeTags(a.tags, b.tags, idMapA, idMapB);
    const tagMaps = mergeTagMaps(a.tagMaps, b.tagMaps, idMapA, idMapB);

    // Step 5: InputFields
    updateProgress(5);
    const inputFields = mergeInputFields(a.inputFields, b.inputFields, idMapA, idMapB, { deviceNameA, deviceNameB });

    // Step 6: Playlists
    updateProgress(6);
    const independentMedia = mergeIndependentMedia(a.independentMedia, b.independentMedia, idMapA, idMapB);
    const playlistItemAccuracies = mergePlaylistItemAccuracy(a.playlistItemAccuracies, b.playlistItemAccuracies, idMapA, idMapB);
    const playlistItems = mergePlaylistItems(a.playlistItems, b.playlistItems, idMapA, idMapB);
    const playlistItemMarkers = mergePlaylistItemMarkers(a.playlistItemMarkers, b.playlistItemMarkers, idMapA, idMapB);
    const playlistItemLocationMaps = mergePlaylistItemLocationMaps(a.playlistItemLocationMaps, b.playlistItemLocationMaps, idMapA, idMapB);
    const playlistItemIndependentMediaMaps = mergePlaylistItemIndependentMediaMaps(a.playlistItemIndependentMediaMaps, b.playlistItemIndependentMediaMaps, idMapA, idMapB);
    const playlistItemMarkerBibleVerseMaps = mergePlaylistItemMarkerBibleVerseMaps(a.playlistItemMarkerBibleVerseMaps, b.playlistItemMarkerBibleVerseMaps, idMapA, idMapB);
    const playlistItemMarkerParagraphMaps = mergePlaylistItemMarkerParagraphMaps(a.playlistItemMarkerParagraphMaps, b.playlistItemMarkerParagraphMaps, idMapA, idMapB);

    const contents: DatabaseContents = {
      locations,
      notes,
      userMarks,
      blockRanges,
      bookmarks,
      tags,
      tagMaps,
      inputFields,
      independentMedia,
      playlistItems,
      playlistItemAccuracies,
      playlistItemIndependentMediaMaps,
      playlistItemLocationMaps,
      playlistItemMarkers,
      playlistItemMarkerBibleVerseMaps,
      playlistItemMarkerParagraphMaps,
      lastModified: '',
      androidMetadata: a.androidMetadata ?? b.androidMetadata,
    };

    // Merge media files from both archives
    const mediaFiles = new Map<string, Uint8Array>();
    for (const [path, data] of archiveA.mediaFiles) {
      mediaFiles.set(path, data);
    }
    for (const [path, data] of archiveB.mediaFiles) {
      if (!mediaFiles.has(path)) {
        mediaFiles.set(path, data);
      }
    }

    // Step 7: Build archive
    updateProgress(7);
    const archiveBytes = await buildArchive(webAdapter, contents, { mediaFiles });

    const result: MergeResult = {
      contents,
      mediaFiles,
      stats: {
        notes: notes.length,
        highlights: userMarks.length,
        bookmarks: bookmarks.length,
        tags: tags.length,
        locations: locations.length,
        inputFields: inputFields.length,
      },
    };

    appState.mergeResult = result;
    appState.archiveBytes = archiveBytes;
    appState.mergeStatus = 'done';
    appState.mergeProgress = {
      step: 'Terminé',
      percent: 100,
      steps: MERGE_STEPS.map((name) => ({ name, status: 'done' })),
    };
    appState.goTo('export');
  } catch (err) {
    appState.mergeStatus = 'error';
    appState.mergeError = err instanceof Error ? err.message : String(err);
  }
}

export function downloadArchive() {
  if (!appState.archiveBytes) return;

  const now = new Date().toISOString().split('T')[0];
  const filename = `MergedBackup_${now}.jwlibrary`;
  const blob = new Blob([appState.archiveBytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
