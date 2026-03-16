import type { PlatformAdapter, Database, ZipEntry } from './platform.js';
import type { DatabaseContents, Manifest } from './models.js';

const DB_NAME = 'userData.db';

// ── Schema DDL (v14) ────────────────────────────────────────

const SCHEMA_DDL = [
  `CREATE TABLE "Location"(
LocationId      INTEGER NOT NULL PRIMARY KEY,
BookNumber      INTEGER,
ChapterNumber   INTEGER,
DocumentId      INTEGER,
Track           INTEGER,
IssueTagNumber  INTEGER NOT NULL DEFAULT 0,
KeySymbol       TEXT,
MepsLanguage    INTEGER,
Type            INTEGER NOT NULL,
Title           TEXT,
UNIQUE(BookNumber, ChapterNumber, KeySymbol, MepsLanguage, Type),
UNIQUE(KeySymbol, IssueTagNumber, MepsLanguage, DocumentId, Track, Type),
CHECK ((
Type = 0 AND ( -- Document or Bible chapter
(DocumentId IS NOT NULL AND DocumentId != 0)
OR ( -- Track based. Requires DocumentId or KeySymbol.
Track IS NOT NULL AND (
(KeySymbol IS NOT NULL AND (length(KeySymbol) > 0))
OR (DocumentId IS NOT NULL AND DocumentId != 0)))
OR ( -- Bible book. Requires KeySymbol.
BookNumber IS NOT NULL AND BookNumber != 0
AND KeySymbol IS NOT NULL AND (length(KeySymbol) > 0)
AND (ChapterNumber IS NULL OR ChapterNumber = 0))
OR ( -- Bible chapter. Requires KeySymbol and BookNumber.
ChapterNumber IS NOT NULL AND ChapterNumber != 0
AND BookNumber IS NOT NULL AND BookNumber != 0
AND KeySymbol IS NOT NULL AND (length(KeySymbol) > 0))))
OR Type != 0),
CHECK((
Type = 1 -- Bible
AND (BookNumber IS NULL OR BookNumber = 0)
AND (ChapterNumber IS NULL OR ChapterNumber = 0)
AND (DocumentId IS NULL OR DocumentId = 0)
AND KeySymbol IS NOT NULL AND (length(KeySymbol) > 0)
AND Track IS NULL)
OR Type != 1),
CHECK((
Type IN (2, 3) -- Mediator audio/video
AND (BookNumber IS NULL OR BookNumber = 0)
AND (ChapterNumber IS NULL OR ChapterNumber = 0))
OR Type NOT IN (2, 3)))`,

  `CREATE TABLE UserMark (
UserMarkId      INTEGER NOT NULL PRIMARY KEY,
ColorIndex      INTEGER NOT NULL,
LocationId      INTEGER NOT NULL,
StyleIndex      INTEGER NOT NULL,
UserMarkGuid    TEXT NOT NULL UNIQUE,
Version         INTEGER NOT NULL,
FOREIGN KEY(LocationId) REFERENCES Location(LocationId))`,

  `CREATE TABLE "Note"(
NoteId           INTEGER NOT NULL PRIMARY KEY,
Guid             TEXT NOT NULL UNIQUE,
UserMarkId       INTEGER,
LocationId       INTEGER,
Title            TEXT,
Content          TEXT,
LastModified     TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
Created          TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
BlockType        INTEGER NOT NULL DEFAULT 0,
BlockIdentifier  INTEGER,
CHECK((BlockType = 0 AND BlockIdentifier IS NULL) OR((BlockType BETWEEN 1 AND 2) AND BlockIdentifier IS NOT NULL)),
FOREIGN KEY(UserMarkId) REFERENCES UserMark(UserMarkId),
FOREIGN KEY(LocationId) REFERENCES Location(LocationId))`,

  `CREATE TABLE BlockRange (
BlockRangeId    INTEGER NOT NULL PRIMARY KEY,
BlockType       INTEGER NOT NULL,
Identifier      INTEGER NOT NULL,
StartToken      INTEGER,
EndToken        INTEGER,
UserMarkId      INTEGER NOT NULL,
CHECK (BlockType BETWEEN 1 AND 2),
FOREIGN KEY(UserMarkId) REFERENCES UserMark(UserMarkId))`,

  `CREATE TABLE Bookmark(
BookmarkId              INTEGER NOT NULL PRIMARY KEY,
LocationId              INTEGER NOT NULL,
PublicationLocationId   INTEGER NOT NULL,
Slot                    INTEGER NOT NULL,
Title                   TEXT NOT NULL,
Snippet                 TEXT,
BlockType               INTEGER NOT NULL DEFAULT 0,
BlockIdentifier         INTEGER,
FOREIGN KEY(LocationId) REFERENCES Location(LocationId),
FOREIGN KEY(PublicationLocationId) REFERENCES Location(LocationId),
CONSTRAINT PublicationLocationId_Slot UNIQUE (PublicationLocationId, Slot),
CHECK((BlockType = 0 AND BlockIdentifier IS NULL) OR ((BlockType BETWEEN 1 AND 2) AND BlockIdentifier IS NOT NULL)))`,

  `CREATE TABLE Tag(
TagId          INTEGER NOT NULL PRIMARY KEY,
Type           INTEGER NOT NULL,
Name           TEXT NOT NULL,
UNIQUE(Type, Name),
CHECK(length(Name) > 0),
CHECK(Type IN (0, 1, 2)))`,

  `CREATE TABLE TagMap (
TagMapId          INTEGER NOT NULL PRIMARY KEY,
PlaylistItemId    INTEGER,
LocationId        INTEGER,
NoteId            INTEGER,
TagId             INTEGER NOT NULL,
Position          INTEGER NOT NULL,
FOREIGN KEY(TagId) REFERENCES Tag(TagId),
FOREIGN KEY(PlaylistItemId) REFERENCES PlaylistItem(PlaylistItemId),
FOREIGN KEY(LocationId) REFERENCES Location(LocationId),
FOREIGN KEY(NoteId) REFERENCES Note(NoteId),
CONSTRAINT TagId_Position UNIQUE(TagId, Position),
CONSTRAINT TagId_NoteId UNIQUE(TagId, NoteId),
CONSTRAINT TagId_LocationId UNIQUE(TagId, LocationId),
CHECK(
    (NoteId IS NULL AND LocationId IS NULL AND PlaylistItemId IS NOT NULL) OR
    (LocationId IS NULL AND PlaylistItemId IS NULL AND NoteId IS NOT NULL) OR
    (PlaylistItemId IS NULL AND NoteId IS NULL AND LocationId IS NOT NULL)))`,

  `CREATE TABLE "InputField"(
LocationId  INTEGER NOT NULL,
TextTag     TEXT NOT NULL,
Value       TEXT NOT NULL,
FOREIGN KEY (LocationId) REFERENCES Location (LocationId),
CONSTRAINT LocationId_TextTag PRIMARY KEY (LocationId, TextTag))`,

  `CREATE TABLE IndependentMedia(
IndependentMediaId  INTEGER NOT NULL PRIMARY KEY,
OriginalFilename    TEXT NOT NULL,
FilePath            TEXT NOT NULL UNIQUE,
MimeType            TEXT NOT NULL,
Hash                TEXT NOT NULL,
CHECK(length(OriginalFilename) > 0),
CHECK(length(FilePath) > 0),
CHECK(length(MimeType) > 0),
CHECK(length(Hash) > 0))`,

  `CREATE TABLE PlaylistItemAccuracy(
PlaylistItemAccuracyId  INTEGER NOT NULL PRIMARY KEY,
Description             TEXT NOT NULL UNIQUE)`,

  `CREATE TABLE "PlaylistItem"(
PlaylistItemId           INTEGER NOT NULL PRIMARY KEY,
Label                    TEXT NOT NULL,
StartTrimOffsetTicks     INTEGER,
EndTrimOffsetTicks       INTEGER,
Accuracy                 INTEGER NOT NULL,
EndAction                INTEGER NOT NULL,
ThumbnailFilePath        TEXT,
FOREIGN KEY(Accuracy) REFERENCES PlaylistItemAccuracy(PlaylistItemAccuracyId),
FOREIGN KEY(ThumbnailFilePath) REFERENCES IndependentMedia(FilePath),
CHECK(length(Label) > 0),
CHECK(EndAction IN(0, 1, 2, 3)))`,

  `CREATE TABLE PlaylistItemIndependentMediaMap(
PlaylistItemId      INTEGER NOT NULL,
IndependentMediaId  INTEGER NOT NULL,
DurationTicks       INTEGER NOT NULL,
PRIMARY KEY(PlaylistItemId, IndependentMediaId),
FOREIGN KEY(PlaylistItemId) REFERENCES PlaylistItem(PlaylistItemId),
FOREIGN KEY(IndependentMediaId) REFERENCES IndependentMedia(IndependentMediaId))
WITHOUT ROWID`,

  `CREATE TABLE PlaylistItemLocationMap(
PlaylistItemId      INTEGER NOT NULL,
LocationId          INTEGER NOT NULL,
MajorMultimediaType INTEGER NOT NULL,
BaseDurationTicks   INTEGER,
PRIMARY KEY(PlaylistItemId, LocationId),
FOREIGN KEY(PlaylistItemId) REFERENCES PlaylistItem(PlaylistItemId),
FOREIGN KEY(LocationId) REFERENCES Location(LocationId))
WITHOUT ROWID`,

  `CREATE TABLE PlaylistItemMarker(
PlaylistItemMarkerId        INTEGER NOT NULL PRIMARY KEY,
PlaylistItemId              INTEGER NOT NULL,
Label                       TEXT NOT NULL,
StartTimeTicks              INTEGER NOT NULL,
DurationTicks               INTEGER NOT NULL,
EndTransitionDurationTicks  INTEGER NOT NULL,
UNIQUE(PlaylistItemId, StartTimeTicks),
FOREIGN KEY(PlaylistItemId) REFERENCES PlaylistItem(PlaylistItemId))`,

  `CREATE TABLE PlaylistItemMarkerBibleVerseMap(
PlaylistItemMarkerId        INTEGER NOT NULL,
VerseId                     INTEGER NOT NULL,
PRIMARY KEY(PlaylistItemMarkerId, VerseId),
FOREIGN KEY(PlaylistItemMarkerId) REFERENCES PlaylistItemMarker(PlaylistItemMarkerId))
WITHOUT ROWID`,

  `CREATE TABLE PlaylistItemMarkerParagraphMap(
PlaylistItemMarkerId        INTEGER NOT NULL,
MepsDocumentId              INTEGER NOT NULL,
ParagraphIndex              INTEGER NOT NULL,
MarkerIndexWithinParagraph  INTEGER NOT NULL,
PRIMARY KEY(PlaylistItemMarkerId, MepsDocumentId, ParagraphIndex, MarkerIndexWithinParagraph),
FOREIGN KEY(PlaylistItemMarkerId) REFERENCES PlaylistItemMarker(PlaylistItemMarkerId))
WITHOUT ROWID`,

  `CREATE TABLE "LastModified"(LastModified TEXT NOT NULL)`,

  `CREATE TABLE android_metadata (locale TEXT)`,
];

// ── Indexes ────────────────────────────────────────────────

const SCHEMA_INDEXES = [
  `CREATE INDEX IX_BlockRange_UserMarkId ON BlockRange(UserMarkId)`,
  `CREATE INDEX IX_Location_KeySymbol_MepsLanguage_BookNumber_ChapterNumber ON Location(KeySymbol, MepsLanguage, BookNumber, ChapterNumber)`,
  `CREATE INDEX IX_Location_MepsLanguage_DocumentId ON Location(MepsLanguage, DocumentId)`,
  `CREATE INDEX IX_Note_LastModified_LocationId ON Note(LastModified, LocationId)`,
  `CREATE INDEX IX_Note_LocationId_BlockIdentifier ON Note(LocationId, BlockIdentifier)`,
  `CREATE INDEX IX_PlaylistItemIndependentMediaMap_IndependentMediaId ON PlaylistItemIndependentMediaMap(IndependentMediaId)`,
  `CREATE INDEX IX_PlaylistItemLocationMap_LocationId ON PlaylistItemLocationMap(LocationId)`,
  `CREATE INDEX IX_PlaylistItem_ThumbnailFilePath ON PlaylistItem(ThumbnailFilePath)`,
  `CREATE INDEX IX_TagMap_LocationId_TagId_Position ON TagMap(LocationId, TagId, Position)`,
  `CREATE INDEX IX_TagMap_NoteId_TagId_Position ON TagMap(NoteId, TagId, Position)`,
  `CREATE INDEX IX_TagMap_PlaylistItemId_TagId_Position ON TagMap(PlaylistItemId, TagId, Position)`,
  `CREATE INDEX IX_TagMap_TagId ON TagMap(TagId)`,
  `CREATE INDEX IX_UserMark_LocationId ON UserMark(LocationId)`,
];

// ── Triggers (created AFTER data insertion) ────────────────

function lastModifiedTriggers(table: string): string[] {
  return [
    `CREATE TRIGGER TR_Update_LastModified_Insert_${table} INSERT ON ${table} BEGIN UPDATE LastModified SET LastModified = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'); END`,
    `CREATE TRIGGER TR_Update_LastModified_Update_${table} UPDATE ON ${table} BEGIN UPDATE LastModified SET LastModified = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'); END`,
    `CREATE TRIGGER TR_Update_LastModified_Delete_${table} DELETE ON ${table} BEGIN UPDATE LastModified SET LastModified = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'); END`,
  ];
}

const SCHEMA_TRIGGERS = [
  ...lastModifiedTriggers('Tag'),
  ...lastModifiedTriggers('TagMap'),
  ...lastModifiedTriggers('Note'),
  ...lastModifiedTriggers('Bookmark'),
  ...lastModifiedTriggers('UserMark'),
  ...lastModifiedTriggers('BlockRange'),
  ...lastModifiedTriggers('IndependentMedia'),
  `CREATE TRIGGER TR_Raise_Error_Before_Insert_LastModified BEFORE INSERT ON LastModified BEGIN SELECT RAISE (FAIL, 'INSERT INTO LastModified not allowed'); END`,
  `CREATE TRIGGER TR_Raise_Error_Before_Delete_LastModified BEFORE DELETE ON LastModified BEGIN SELECT RAISE (FAIL, 'DELETE FROM LastModified not allowed'); END`,
];

// ── Insert helpers ──────────────────────────────────────────

async function insertRows<T extends object>(
  adapter: PlatformAdapter,
  db: Database,
  table: string,
  columns: (keyof T & string)[],
  rows: T[],
): Promise<void> {
  if (rows.length === 0) return;
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${placeholders})`;
  for (const row of rows) {
    const params = columns.map((col) => (row[col] as unknown) ?? null);
    await adapter.executeRun(db, sql, params);
  }
}

// ── Build archive ───────────────────────────────────────────

export interface BuildArchiveOptions {
  /** Device name for the manifest. Defaults to "JW Notes Sync". */
  deviceName?: string;
  /** Media files to include (filePath → bytes). */
  mediaFiles?: Map<string, Uint8Array>;
}

/**
 * Build a valid .jwlibrary archive from merged database contents.
 *
 * Creates a new SQLite database with schema v14, inserts all rows
 * in dependency order, generates a manifest with SHA-256 hash,
 * and packs everything into a ZIP.
 *
 * @returns The .jwlibrary archive as raw bytes (ZIP).
 */
export async function buildArchive(
  adapter: PlatformAdapter,
  contents: DatabaseContents,
  options: BuildArchiveOptions = {},
): Promise<Uint8Array> {
  const deviceName = options.deviceName ?? 'JW Notes Sync';
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const db = await adapter.createDatabase();

  try {
    // 1. Create schema (tables + indexes)
    await adapter.executeRun(db, 'PRAGMA foreign_keys = OFF');
    await adapter.executeRun(db, 'PRAGMA user_version = 14');
    for (const ddl of SCHEMA_DDL) {
      await adapter.executeRun(db, ddl);
    }
    for (const idx of SCHEMA_INDEXES) {
      await adapter.executeRun(db, idx);
    }

    // 2. Insert data in dependency order (single transaction for performance)
    await adapter.executeRun(db, 'BEGIN TRANSACTION');
    await insertRows(adapter, db, 'Location', [
      'LocationId', 'BookNumber', 'ChapterNumber', 'DocumentId', 'Track',
      'IssueTagNumber', 'KeySymbol', 'MepsLanguage', 'Type', 'Title',
    ], contents.locations);

    await insertRows(adapter, db, 'UserMark', [
      'UserMarkId', 'ColorIndex', 'LocationId', 'StyleIndex', 'UserMarkGuid', 'Version',
    ], contents.userMarks);

    await insertRows(adapter, db, 'Note', [
      'NoteId', 'Guid', 'UserMarkId', 'LocationId', 'Title', 'Content',
      'LastModified', 'Created', 'BlockType', 'BlockIdentifier',
    ], contents.notes);

    await insertRows(adapter, db, 'BlockRange', [
      'BlockRangeId', 'BlockType', 'Identifier', 'StartToken', 'EndToken', 'UserMarkId',
    ], contents.blockRanges);

    await insertRows(adapter, db, 'Bookmark', [
      'BookmarkId', 'LocationId', 'PublicationLocationId', 'Slot', 'Title',
      'Snippet', 'BlockType', 'BlockIdentifier',
    ], contents.bookmarks);

    await insertRows(adapter, db, 'Tag', [
      'TagId', 'Type', 'Name',
    ], contents.tags);

    await insertRows(adapter, db, 'InputField', [
      'LocationId', 'TextTag', 'Value',
    ], contents.inputFields);

    await insertRows(adapter, db, 'IndependentMedia', [
      'IndependentMediaId', 'OriginalFilename', 'FilePath', 'MimeType', 'Hash',
    ], contents.independentMedia);

    await insertRows(adapter, db, 'PlaylistItemAccuracy', [
      'PlaylistItemAccuracyId', 'Description',
    ], contents.playlistItemAccuracies);

    await insertRows(adapter, db, 'PlaylistItem', [
      'PlaylistItemId', 'Label', 'StartTrimOffsetTicks', 'EndTrimOffsetTicks',
      'Accuracy', 'EndAction', 'ThumbnailFilePath',
    ], contents.playlistItems);

    await insertRows(adapter, db, 'TagMap', [
      'TagMapId', 'PlaylistItemId', 'LocationId', 'NoteId', 'TagId', 'Position',
    ], contents.tagMaps);

    await insertRows(adapter, db, 'PlaylistItemIndependentMediaMap', [
      'PlaylistItemId', 'IndependentMediaId', 'DurationTicks',
    ], contents.playlistItemIndependentMediaMaps);

    await insertRows(adapter, db, 'PlaylistItemLocationMap', [
      'PlaylistItemId', 'LocationId', 'MajorMultimediaType', 'BaseDurationTicks',
    ], contents.playlistItemLocationMaps);

    await insertRows(adapter, db, 'PlaylistItemMarker', [
      'PlaylistItemMarkerId', 'PlaylistItemId', 'Label', 'StartTimeTicks',
      'DurationTicks', 'EndTransitionDurationTicks',
    ], contents.playlistItemMarkers);

    await insertRows(adapter, db, 'PlaylistItemMarkerBibleVerseMap', [
      'PlaylistItemMarkerId', 'VerseId',
    ], contents.playlistItemMarkerBibleVerseMaps);

    await insertRows(adapter, db, 'PlaylistItemMarkerParagraphMap', [
      'PlaylistItemMarkerId', 'MepsDocumentId', 'ParagraphIndex', 'MarkerIndexWithinParagraph',
    ], contents.playlistItemMarkerParagraphMaps);

    // LastModified
    await adapter.executeRun(
      db,
      'INSERT INTO "LastModified" (LastModified) VALUES (?)',
      [now],
    );

    // android_metadata (required for compatibility)
    await adapter.executeRun(
      db,
      'INSERT INTO android_metadata (locale) VALUES (?)',
      [contents.androidMetadata ?? 'en_US'],
    );
    await adapter.executeRun(db, 'COMMIT');

    // 3. Create triggers (after data insertion to avoid LastModified conflicts)
    for (const trigger of SCHEMA_TRIGGERS) {
      await adapter.executeRun(db, trigger);
    }

    // 5. Validate FK constraints
    await adapter.executeRun(db, 'PRAGMA foreign_keys = ON');
    const fkErrors = await adapter.executeQuery(db, 'PRAGMA foreign_key_check');
    if (fkErrors.length > 0) {
      throw new Error(
        `Foreign key violations detected: ${JSON.stringify(fkErrors)}`,
      );
    }

    // 6. Export database bytes
    const dbBytes = await adapter.exportDatabase(db);

    // 7. Compute hash
    const hash = await adapter.hashSHA256(dbBytes);

    // 8. Build manifest
    const dateStr = now.split('T')[0]!;
    const manifest: Manifest = {
      name: `MergedBackup_${dateStr}.jwlibrary`,
      creationDate: dateStr,
      version: 1,
      type: 0,
      userDataBackup: {
        lastModifiedDate: now,
        deviceName,
        databaseName: DB_NAME,
        hash,
        schemaVersion: 14,
      },
    };

    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));

    // 9. Pack ZIP
    const entries: ZipEntry[] = [
      { path: 'manifest.json', data: manifestBytes },
      { path: DB_NAME, data: dbBytes },
    ];

    // Include media files
    if (options.mediaFiles) {
      for (const [path, data] of options.mediaFiles) {
        entries.push({ path, data });
      }
    }

    return adapter.createZip(entries);
  } finally {
    await adapter.closeDatabase(db);
  }
}
