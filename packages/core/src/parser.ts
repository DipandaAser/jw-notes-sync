import type { PlatformAdapter } from './platform.js';
import type {
  JWLibraryArchive,
  Manifest,
  DatabaseContents,
  Location,
  Note,
  UserMark,
  BlockRange,
  Bookmark,
  Tag,
  TagMap,
  InputField,
  IndependentMedia,
  PlaylistItem,
  PlaylistItemAccuracy,
  PlaylistItemIndependentMediaMap,
  PlaylistItemLocationMap,
  PlaylistItemMarker,
  PlaylistItemMarkerBibleVerseMap,
  PlaylistItemMarkerParagraphMap,
} from './models.js';
import { ManifestSchema, CURRENT_SCHEMA_VERSION } from './schema.js';

const DB_NAME = 'userData.db';
const MANIFEST_NAME = 'manifest.json';

/**
 * Parse a .jwlibrary backup file into structured data.
 */
export async function parseJWLibrary(
  adapter: PlatformAdapter,
  archiveBytes: Uint8Array,
): Promise<JWLibraryArchive> {
  // 1. Extract ZIP
  const zip = await adapter.extractZip(archiveBytes);

  // 2. Parse and validate manifest
  const manifestBytes = zip.files.get(MANIFEST_NAME);
  if (!manifestBytes) {
    throw new Error('manifest.json not found in archive');
  }
  const manifestJson: unknown = JSON.parse(new TextDecoder().decode(manifestBytes));
  const manifest: Manifest = ManifestSchema.parse(manifestJson);

  // 3. Validate schema version
  if (manifest.userDataBackup.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schema version ${manifest.userDataBackup.schemaVersion}. Expected ${CURRENT_SCHEMA_VERSION}.`,
    );
  }

  // 4. Load database
  const dbBytes = zip.files.get(manifest.userDataBackup.databaseName ?? DB_NAME);
  if (!dbBytes) {
    throw new Error(`${DB_NAME} not found in archive`);
  }

  // 5. Verify hash
  const hash = await adapter.hashSHA256(dbBytes);
  if (hash !== manifest.userDataBackup.hash) {
    throw new Error(
      `Database hash mismatch. Expected ${manifest.userDataBackup.hash}, got ${hash}.`,
    );
  }

  const db = await adapter.openDatabase(dbBytes);

  try {
    // 6. Query all tables
    const database = await loadDatabase(adapter, db);

    // 7. Collect media files
    const mediaFiles = new Map<string, Uint8Array>();
    for (const [path, data] of zip.files) {
      if (path !== MANIFEST_NAME && path !== manifest.userDataBackup.databaseName) {
        mediaFiles.set(path, data);
      }
    }

    return { manifest, database, mediaFiles };
  } finally {
    await adapter.closeDatabase(db);
  }
}

// ── Database loading ────────────────────────────────────────

async function loadDatabase(
  adapter: PlatformAdapter,
  db: import('./platform.js').Database,
): Promise<DatabaseContents> {
  const [
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
    lastModifiedRows,
    androidMetadataRows,
  ] = await Promise.all([
    queryTable<Location>(adapter, db, 'Location'),
    queryTable<Note>(adapter, db, 'Note'),
    queryTable<UserMark>(adapter, db, 'UserMark'),
    queryTable<BlockRange>(adapter, db, 'BlockRange'),
    queryTable<Bookmark>(adapter, db, 'Bookmark'),
    queryTable<Tag>(adapter, db, 'Tag'),
    queryTable<TagMap>(adapter, db, 'TagMap'),
    queryTable<InputField>(adapter, db, 'InputField'),
    queryTable<IndependentMedia>(adapter, db, 'IndependentMedia'),
    queryTable<PlaylistItem>(adapter, db, 'PlaylistItem'),
    queryTable<PlaylistItemAccuracy>(adapter, db, 'PlaylistItemAccuracy'),
    queryTable<PlaylistItemIndependentMediaMap>(adapter, db, 'PlaylistItemIndependentMediaMap'),
    queryTable<PlaylistItemLocationMap>(adapter, db, 'PlaylistItemLocationMap'),
    queryTable<PlaylistItemMarker>(adapter, db, 'PlaylistItemMarker'),
    queryTable<PlaylistItemMarkerBibleVerseMap>(adapter, db, 'PlaylistItemMarkerBibleVerseMap'),
    queryTable<PlaylistItemMarkerParagraphMap>(adapter, db, 'PlaylistItemMarkerParagraphMap'),
    adapter.executeQuery(db, 'SELECT LastModified FROM LastModified'),
    adapter.executeQuery(db, 'SELECT locale FROM android_metadata'),
  ]);

  const lastModified = (lastModifiedRows[0]?.['LastModified'] as string | undefined) ?? '';
  const androidMetadata =
    (androidMetadataRows[0]?.['locale'] as string | undefined) ?? null;

  return {
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
    lastModified,
    androidMetadata,
  };
}

async function queryTable<T>(
  adapter: PlatformAdapter,
  db: import('./platform.js').Database,
  tableName: string,
): Promise<T[]> {
  const rows = await adapter.executeQuery(db, `SELECT * FROM ${tableName}`);
  return rows as unknown as T[];
}
