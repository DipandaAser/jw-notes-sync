import type { PlatformAdapter, Database } from './platform.js';
import type { JWLibraryArchive, Manifest, DatabaseContents } from './models.js';
import { ManifestSchema, getSchemaDefinition, getSupportedVersions } from './schema.js';

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

  // 3. Validate schema version against registry
  const version = manifest.userDataBackup.schemaVersion;
  const schemaDef = getSchemaDefinition(version);
  if (!schemaDef) {
    const supported = getSupportedVersions().join(', ');
    throw new Error(
      `Unsupported schema version ${version}. Supported versions: ${supported}.`,
    );
  }

  // 4. Load database
  const dbBytes = zip.files.get(manifest.userDataBackup.databaseName ?? DB_NAME);
  if (!dbBytes) {
    throw new Error(`${DB_NAME} not found in archive`);
  }

  // 5. Verify hash (warn but don't reject — real-world archives may have mismatches)
  const hash = await adapter.hashSHA256(dbBytes);
  if (hash !== manifest.userDataBackup.hash) {
    console.warn(
      `Database hash mismatch. Expected ${manifest.userDataBackup.hash}, got ${hash}. Proceeding anyway.`,
    );
  }

  const db = await adapter.openDatabase(dbBytes);

  try {
    // 6. Query all tables declared in this schema version
    const database = await loadDatabase(adapter, db, schemaDef.tables);

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

/** Map from table name to the key in DatabaseContents */
const TABLE_KEY_MAP: Record<string, keyof DatabaseContents> = {
  Location: 'locations',
  Note: 'notes',
  UserMark: 'userMarks',
  BlockRange: 'blockRanges',
  Bookmark: 'bookmarks',
  Tag: 'tags',
  TagMap: 'tagMaps',
  InputField: 'inputFields',
  IndependentMedia: 'independentMedia',
  PlaylistItem: 'playlistItems',
  PlaylistItemAccuracy: 'playlistItemAccuracies',
  PlaylistItemIndependentMediaMap: 'playlistItemIndependentMediaMaps',
  PlaylistItemLocationMap: 'playlistItemLocationMaps',
  PlaylistItemMarker: 'playlistItemMarkers',
  PlaylistItemMarkerBibleVerseMap: 'playlistItemMarkerBibleVerseMaps',
  PlaylistItemMarkerParagraphMap: 'playlistItemMarkerParagraphMaps',
};

async function loadDatabase(
  adapter: PlatformAdapter,
  db: Database,
  tables: string[],
): Promise<DatabaseContents> {
  const result: DatabaseContents = {
    locations: [],
    notes: [],
    userMarks: [],
    blockRanges: [],
    bookmarks: [],
    tags: [],
    tagMaps: [],
    inputFields: [],
    independentMedia: [],
    playlistItems: [],
    playlistItemAccuracies: [],
    playlistItemIndependentMediaMaps: [],
    playlistItemLocationMaps: [],
    playlistItemMarkers: [],
    playlistItemMarkerBibleVerseMaps: [],
    playlistItemMarkerParagraphMaps: [],
    lastModified: '',
    androidMetadata: null,
  };

  // Get actual tables present in the database
  const tableInfoRows = await adapter.executeQuery(
    db,
    `SELECT name FROM sqlite_master WHERE type='table'`,
  );
  const existingTables = new Set(tableInfoRows.map((r) => r['name'] as string));

  // Query tables sequentially (expo-sqlite doesn't support concurrent queries)
  for (const table of tables) {
    if (!existingTables.has(table)) continue;
    const rows = await adapter.executeQuery(db, `SELECT * FROM ${table}`);

    if (table === 'LastModified') {
      result.lastModified = (rows[0]?.['LastModified'] as string | undefined) ?? '';
      continue;
    }
    if (table === 'android_metadata') {
      result.androidMetadata = (rows[0]?.['locale'] as string | undefined) ?? null;
      continue;
    }

    const key = TABLE_KEY_MAP[table];
    if (key) {
      (result[key] as unknown[]) = rows;
    }
  }
  return result;
}
