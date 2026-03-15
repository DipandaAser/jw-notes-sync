import { z } from 'zod';

// ── Manifest validation ─────────────────────────────────────

export const UserDataBackupSchema = z.object({
  lastModifiedDate: z.string(),
  deviceName: z.string(),
  databaseName: z.string(),
  hash: z.string(),
  schemaVersion: z.number(),
});

export const ManifestSchema = z.object({
  name: z.string(),
  creationDate: z.string(),
  version: z.number(),
  type: z.number(),
  userDataBackup: UserDataBackupSchema,
});

// ── Schema version registry ─────────────────────────────────

export interface SchemaDefinition {
  version: number;
  tables: string[];
}

const schemaRegistry = new Map<number, SchemaDefinition>();

function registerSchema(def: SchemaDefinition): void {
  schemaRegistry.set(def.version, def);
}

export function getSchemaDefinition(version: number): SchemaDefinition | undefined {
  return schemaRegistry.get(version);
}

export function getSupportedVersions(): number[] {
  return [...schemaRegistry.keys()].sort((a, b) => a - b);
}

// ── Schema v14 (current) ────────────────────────────────────

registerSchema({
  version: 14,
  tables: [
    'Location',
    'Note',
    'UserMark',
    'BlockRange',
    'Bookmark',
    'Tag',
    'TagMap',
    'InputField',
    'IndependentMedia',
    'PlaylistItem',
    'PlaylistItemAccuracy',
    'PlaylistItemIndependentMediaMap',
    'PlaylistItemLocationMap',
    'PlaylistItemMarker',
    'PlaylistItemMarkerBibleVerseMap',
    'PlaylistItemMarkerParagraphMap',
    'LastModified',
    'android_metadata',
  ],
});
