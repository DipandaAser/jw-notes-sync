export {
  type PlatformAdapter,
  type Database,
  type Row,
  type ZipContents,
  type ZipEntry,
} from './platform.js';

export { runAdapterContractTests } from './platform-contract.js';

export {
  type Location,
  type Note,
  type UserMark,
  type BlockRange,
  type Bookmark,
  type Tag,
  type TagMap,
  type InputField,
  type IndependentMedia,
  type PlaylistItem,
  type PlaylistItemAccuracy,
  type PlaylistItemIndependentMediaMap,
  type PlaylistItemLocationMap,
  type PlaylistItemMarker,
  type PlaylistItemMarkerBibleVerseMap,
  type PlaylistItemMarkerParagraphMap,
  type DatabaseContents,
  type JWLibraryArchive,
  type Manifest,
  type UserDataBackup,
} from './models.js';

export {
  ManifestSchema,
  type SchemaDefinition,
  getSchemaDefinition,
  getSupportedVersions,
} from './schema.js';

export { parseJWLibrary } from './parser.js';

export { IdMap } from './id-map.js';
export { mergeLocations, locationNaturalKey } from './merge-locations.js';
export { mergeNotes, type MergeNotesOptions } from './merge-notes.js';
export { mergeUserMarks, mergeBlockRanges, type MergeUserMarksOptions } from './merge-usermarks.js';
export { mergeBookmarks } from './merge-bookmarks.js';
export { mergeTags, mergeTagMaps } from './merge-tags.js';
export { mergeInputFields, type MergeInputFieldsOptions } from './merge-input-fields.js';
export {
  mergeIndependentMedia,
  mergePlaylistItemAccuracy,
  mergePlaylistItems,
  mergePlaylistItemMarkers,
  mergePlaylistItemLocationMaps,
  mergePlaylistItemIndependentMediaMaps,
  mergePlaylistItemMarkerBibleVerseMaps,
  mergePlaylistItemMarkerParagraphMaps,
} from './merge-playlists.js';
export { buildArchive, type BuildArchiveOptions } from './builder.js';
export { groupBy, buildReverseIndex } from './utils.js';
export {
  type MergeConfig,
  type MergePreset,
  type NoteConflictStrategy,
  type HighlightConflictStrategy,
  type InputFieldConflictStrategy,
  DEFAULT_MERGE_CONFIG,
  presetToConfig,
  MERGE_PRESETS,
} from './merge-config.js';
