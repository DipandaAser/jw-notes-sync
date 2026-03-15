/**
 * Type-safe models for all 18 tables in the JW Library userData.db (schema v14).
 */

// ── Table types ─────────────────────────────────────────────

export interface Location {
  LocationId: number;
  BookNumber: number | null;
  ChapterNumber: number | null;
  DocumentId: number | null;
  Track: number | null;
  IssueTagNumber: number;
  KeySymbol: string | null;
  MepsLanguage: number | null;
  Type: number;
  Title: string | null;
}

export interface Note {
  NoteId: number;
  Guid: string;
  UserMarkId: number | null;
  LocationId: number | null;
  Title: string | null;
  Content: string | null;
  LastModified: string;
  Created: string;
  BlockType: number;
  BlockIdentifier: number | null;
}

export interface UserMark {
  UserMarkId: number;
  ColorIndex: number;
  LocationId: number;
  StyleIndex: number;
  UserMarkGuid: string;
  Version: number;
}

export interface BlockRange {
  BlockRangeId: number;
  BlockType: number;
  Identifier: number;
  StartToken: number | null;
  EndToken: number | null;
  UserMarkId: number;
}

export interface Bookmark {
  BookmarkId: number;
  LocationId: number;
  PublicationLocationId: number;
  Slot: number;
  Title: string;
  Snippet: string | null;
  BlockType: number;
  BlockIdentifier: number | null;
}

export interface Tag {
  TagId: number;
  Type: number;
  Name: string;
}

export interface TagMap {
  TagMapId: number;
  PlaylistItemId: number | null;
  LocationId: number | null;
  NoteId: number | null;
  TagId: number;
  Position: number;
}

export interface InputField {
  LocationId: number;
  TextTag: string;
  Value: string;
}

export interface IndependentMedia {
  IndependentMediaId: number;
  OriginalFilename: string;
  FilePath: string;
  MimeType: string;
  Hash: string;
}

export interface PlaylistItem {
  PlaylistItemId: number;
  Label: string;
  StartTrimOffsetTicks: number | null;
  EndTrimOffsetTicks: number | null;
  Accuracy: number;
  EndAction: number;
  ThumbnailFilePath: string | null;
}

export interface PlaylistItemAccuracy {
  PlaylistItemAccuracyId: number;
  Description: string;
}

export interface PlaylistItemIndependentMediaMap {
  PlaylistItemId: number;
  IndependentMediaId: number;
  DurationTicks: number;
}

export interface PlaylistItemLocationMap {
  PlaylistItemId: number;
  LocationId: number;
  MajorMultimediaType: number;
  BaseDurationTicks: number | null;
}

export interface PlaylistItemMarker {
  PlaylistItemMarkerId: number;
  PlaylistItemId: number;
  Label: string;
  StartTimeTicks: number;
  DurationTicks: number;
  EndTransitionDurationTicks: number;
}

export interface PlaylistItemMarkerBibleVerseMap {
  PlaylistItemMarkerId: number;
  VerseId: number;
}

export interface PlaylistItemMarkerParagraphMap {
  PlaylistItemMarkerId: number;
  MepsDocumentId: number;
  ParagraphIndex: number;
  MarkerIndexWithinParagraph: number;
}

// ── Aggregate types ─────────────────────────────────────────

export interface DatabaseContents {
  locations: Location[];
  notes: Note[];
  userMarks: UserMark[];
  blockRanges: BlockRange[];
  bookmarks: Bookmark[];
  tags: Tag[];
  tagMaps: TagMap[];
  inputFields: InputField[];
  independentMedia: IndependentMedia[];
  playlistItems: PlaylistItem[];
  playlistItemAccuracies: PlaylistItemAccuracy[];
  playlistItemIndependentMediaMaps: PlaylistItemIndependentMediaMap[];
  playlistItemLocationMaps: PlaylistItemLocationMap[];
  playlistItemMarkers: PlaylistItemMarker[];
  playlistItemMarkerBibleVerseMaps: PlaylistItemMarkerBibleVerseMap[];
  playlistItemMarkerParagraphMaps: PlaylistItemMarkerParagraphMap[];
  lastModified: string;
  androidMetadata: string | null;
}

export interface JWLibraryArchive {
  manifest: Manifest;
  database: DatabaseContents;
  mediaFiles: Map<string, Uint8Array>;
}

export interface Manifest {
  name: string;
  creationDate: string;
  version: number;
  type: number;
  userDataBackup: UserDataBackup;
}

export interface UserDataBackup {
  lastModifiedDate: string;
  deviceName: string;
  databaseName: string;
  hash: string;
  schemaVersion: number;
}
