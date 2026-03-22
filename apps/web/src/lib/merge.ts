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
  type MergeConfig,
} from '@jw-notes-sync/core';
import { webAdapter } from '$lib/adapter';
import { appState, type MergeResult } from '$lib/stores/app.svelte';
import { saveMergedBackup } from '$lib/storage';
import { t } from '$lib/i18n.svelte';

const MERGE_STEP_KEYS = [
  'steps.locations',
  'steps.highlights',
  'steps.notes',
  'steps.bookmarks',
  'steps.playlists',
  'steps.tags',
  'steps.inputFields',
  'steps.export',
] as const;

function updateProgress(stepIndex: number) {
  const percent = Math.round(((stepIndex + 1) / MERGE_STEP_KEYS.length) * 100);
  appState.mergeProgress = {
    step: t(MERGE_STEP_KEYS[stepIndex]!),
    percent,
    steps: MERGE_STEP_KEYS.map((key, i) => ({
      name: t(key),
      status: i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'pending',
    })),
  };
}

export async function runMerge(archiveA: JWLibraryArchive, archiveB: JWLibraryArchive, config?: MergeConfig): Promise<void> {
  const mergeConfig = config ?? appState.mergeConfig;
  const isDryRun = appState.dryRun;
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
    const { merged: userMarks, winners } = mergeUserMarks(a.userMarks, b.userMarks, idMapA, idMapB, { strategy: mergeConfig.highlights });
    const blockRanges = mergeBlockRanges(a.blockRanges, b.blockRanges, idMapA, idMapB, winners);

    // Step 2: Notes
    updateProgress(2);
    const notes = mergeNotes(a.notes, b.notes, idMapA, idMapB, { deviceNameA, deviceNameB, strategy: mergeConfig.notes });

    // Step 3: Bookmarks
    updateProgress(3);
    const bookmarks = mergeBookmarks(a.bookmarks, b.bookmarks, idMapA, idMapB);

    // Step 4: Playlists (must be before TagMaps since TagMap references PlaylistItemId)
    updateProgress(4);
    const independentMedia = mergeIndependentMedia(a.independentMedia, b.independentMedia, idMapA, idMapB);
    const playlistItemAccuracies = mergePlaylistItemAccuracy(a.playlistItemAccuracies, b.playlistItemAccuracies, idMapA, idMapB);
    const playlistItems = mergePlaylistItems(a.playlistItems, b.playlistItems, idMapA, idMapB);
    const playlistItemMarkers = mergePlaylistItemMarkers(a.playlistItemMarkers, b.playlistItemMarkers, idMapA, idMapB);
    const playlistItemLocationMaps = mergePlaylistItemLocationMaps(a.playlistItemLocationMaps, b.playlistItemLocationMaps, idMapA, idMapB);
    const playlistItemIndependentMediaMaps = mergePlaylistItemIndependentMediaMaps(a.playlistItemIndependentMediaMaps, b.playlistItemIndependentMediaMaps, idMapA, idMapB);
    const playlistItemMarkerBibleVerseMaps = mergePlaylistItemMarkerBibleVerseMaps(a.playlistItemMarkerBibleVerseMaps, b.playlistItemMarkerBibleVerseMaps, idMapA, idMapB);
    const playlistItemMarkerParagraphMaps = mergePlaylistItemMarkerParagraphMaps(a.playlistItemMarkerParagraphMaps, b.playlistItemMarkerParagraphMaps, idMapA, idMapB);

    // Step 5: Tags + TagMaps (after PlaylistItems so TagMap can resolve PlaylistItemId FKs)
    updateProgress(5);
    const tags = mergeTags(a.tags, b.tags, idMapA, idMapB);
    const tagMaps = mergeTagMaps(a.tagMaps, b.tagMaps, idMapA, idMapB);

    // Step 6: InputFields
    updateProgress(6);
    const inputFields = mergeInputFields(a.inputFields, b.inputFields, idMapA, idMapB, { deviceNameA, deviceNameB, strategy: mergeConfig.inputFields });

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

    const mergeStats = {
      notes: notes.length,
      highlights: userMarks.length,
      bookmarks: bookmarks.length,
      tags: tags.length,
      locations: locations.length,
      inputFields: inputFields.length,
    };

    if (isDryRun) {
      // Dry-run: skip archive build, go straight to explorer
      updateProgress(7);
      const result: MergeResult = { contents, mediaFiles, stats: mergeStats };
      appState.mergeResult = result;
      appState.mergeStatus = 'done';
      appState.mergeProgress = {
        step: t('steps.done'),
        percent: 100,
        steps: MERGE_STEP_KEYS.map((key) => ({ name: t(key), status: 'done' })),
      };

      // Log to history
      appState.addMergeHistory({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        sources: appState.backups.map((b) => ({ deviceName: b.deviceName, fileName: b.fileName })),
        stats: mergeStats,
        config: { ...mergeConfig },
        dryRun: true,
      });

      appState.pendingBackupIds = [];
      appState.openExplorer(contents, t('config.dryRun.badge'));
    } else {
      // Full merge: build archive
      updateProgress(7);
      const archiveBytes = await buildArchive(webAdapter, contents, { mediaFiles });

      const result: MergeResult = { contents, mediaFiles, stats: mergeStats };
      appState.mergeResult = result;
      appState.archiveBytes = archiveBytes;
      appState.mergeStatus = 'done';
      appState.mergeProgress = {
        step: t('steps.done'),
        percent: 100,
        steps: MERGE_STEP_KEYS.map((key) => ({ name: t(key), status: 'done' })),
      };

      // Save as source of truth in library mode
      if (appState.mergeMode === 'library') {
        const mergedId = crypto.randomUUID();
        const now = new Date().toISOString().split('T')[0];
        await saveMergedBackup(mergedId, archiveBytes, {
          id: mergedId,
          fileName: `MergedBackup_${now}.jwlibrary`,
          deviceName: 'JW Notes Sync',
          date: new Date().toISOString(),
          stats: mergeStats,
          parentIds: appState.backups.map((b) => b.id),
        });
        await appState.refreshSourceOfTruth();
        await appState.refreshStorage();
      }

      // Log to history
      appState.addMergeHistory({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        sources: appState.backups.map((b) => ({ deviceName: b.deviceName, fileName: b.fileName })),
        stats: mergeStats,
        config: { ...mergeConfig },
        dryRun: false,
      });

      // Merge succeeded — pending backups are now committed
      appState.pendingBackupIds = [];

      appState.goTo('export');
    }
  } catch (err) {
    appState.mergeStatus = 'error';
    appState.mergeError = err instanceof Error ? err.message : String(err);
  }
}

export function downloadArchive() {
  if (!appState.archiveBytes) return;

  const now = new Date().toISOString().split('T')[0];
  const filename = `MergedBackup_${now}.jwlibrary`;
  const blob = new Blob([appState.archiveBytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
