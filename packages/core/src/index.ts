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
export { mergeUserMarks, mergeBlockRanges } from './merge-usermarks.js';
export { groupBy, buildReverseIndex } from './utils.js';
