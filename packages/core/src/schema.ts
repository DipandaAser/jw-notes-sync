import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 14;

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
