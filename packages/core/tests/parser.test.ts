import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseJWLibrary, CURRENT_SCHEMA_VERSION } from '../src/index.js';
import { nodeAdapter } from './node-adapter.js';

const fixturePath = resolve(__dirname, 'fixtures/sample.jwlibrary');
const fixtureBytes = new Uint8Array(readFileSync(fixturePath));

describe('parseJWLibrary', () => {
  it('should parse the manifest correctly', async () => {
    const archive = await parseJWLibrary(nodeAdapter, fixtureBytes);

    expect(archive.manifest.name).toBe(
      'UserdataBackup_2026-03-13_Google_Pixel_6a.jwlibrary',
    );
    expect(archive.manifest.creationDate).toBe('2026-03-13');
    expect(archive.manifest.version).toBe(1);
    expect(archive.manifest.type).toBe(0);
    expect(archive.manifest.userDataBackup.deviceName).toBe('Google_Pixel 6a');
    expect(archive.manifest.userDataBackup.databaseName).toBe('userData.db');
    expect(archive.manifest.userDataBackup.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('should load all tables with correct row counts', async () => {
    const archive = await parseJWLibrary(nodeAdapter, fixtureBytes);
    const db = archive.database;

    expect(db.locations).toHaveLength(543);
    expect(db.notes).toHaveLength(312);
    expect(db.userMarks).toHaveLength(2141);
    expect(db.blockRanges).toHaveLength(2180);
    expect(db.bookmarks).toHaveLength(9);
    expect(db.tags).toHaveLength(80);
    expect(db.tagMaps).toHaveLength(290);
    expect(db.inputFields).toHaveLength(279);
    expect(db.independentMedia).toHaveLength(11);
    expect(db.playlistItems).toHaveLength(11);
    expect(db.playlistItemAccuracies).toHaveLength(2);
    expect(db.playlistItemIndependentMediaMaps).toHaveLength(0);
    expect(db.playlistItemLocationMaps).toHaveLength(11);
    expect(db.playlistItemMarkers).toHaveLength(0);
    expect(db.playlistItemMarkerBibleVerseMaps).toHaveLength(0);
    expect(db.playlistItemMarkerParagraphMaps).toHaveLength(0);
  });

  it('should have valid lastModified and androidMetadata', async () => {
    const archive = await parseJWLibrary(nodeAdapter, fixtureBytes);

    expect(archive.database.lastModified).toBeTruthy();
    expect(typeof archive.database.lastModified).toBe('string');
  });

  it('should extract media files', async () => {
    const archive = await parseJWLibrary(nodeAdapter, fixtureBytes);

    // Total files in ZIP minus manifest.json and userData.db
    expect(archive.mediaFiles.size).toBeGreaterThan(0);

    // Should not include manifest or db in media
    expect(archive.mediaFiles.has('manifest.json')).toBe(false);
    expect(archive.mediaFiles.has('userData.db')).toBe(false);
  });

  it('should have typed Location rows', async () => {
    const archive = await parseJWLibrary(nodeAdapter, fixtureBytes);
    const loc = archive.database.locations[0];

    expect(loc).toBeDefined();
    expect(typeof loc!.LocationId).toBe('number');
    expect(typeof loc!.Type).toBe('number');
    expect(typeof loc!.IssueTagNumber).toBe('number');
  });

  it('should have typed Note rows with GUIDs', async () => {
    const archive = await parseJWLibrary(nodeAdapter, fixtureBytes);
    const note = archive.database.notes[0];

    expect(note).toBeDefined();
    expect(typeof note!.NoteId).toBe('number');
    expect(typeof note!.Guid).toBe('string');
    expect(note!.Guid.length).toBeGreaterThan(0);
    expect(typeof note!.LastModified).toBe('string');
    expect(typeof note!.Created).toBe('string');
  });

  it('should have typed UserMark rows', async () => {
    const archive = await parseJWLibrary(nodeAdapter, fixtureBytes);
    const mark = archive.database.userMarks[0];

    expect(mark).toBeDefined();
    expect(typeof mark!.UserMarkId).toBe('number');
    expect(typeof mark!.ColorIndex).toBe('number');
    expect(typeof mark!.UserMarkGuid).toBe('string');
    expect(typeof mark!.Version).toBe('number');
  });

  it('should verify database hash matches manifest', async () => {
    // This is implicitly tested — parseJWLibrary throws if hash mismatches.
    // We verify it succeeds with the real fixture.
    const archive = await parseJWLibrary(nodeAdapter, fixtureBytes);
    expect(archive.manifest.userDataBackup.hash).toBeTruthy();
  });
});

describe('parseJWLibrary error handling', () => {
  it('should reject archive without manifest.json', async () => {
    const zip = await nodeAdapter.createZip([
      { path: 'userData.db', data: new Uint8Array([1, 2, 3]) },
    ]);

    await expect(parseJWLibrary(nodeAdapter, zip)).rejects.toThrow(
      'manifest.json not found',
    );
  });

  it('should reject invalid manifest JSON', async () => {
    const zip = await nodeAdapter.createZip([
      { path: 'manifest.json', data: new TextEncoder().encode('{"bad": true}') },
      { path: 'userData.db', data: new Uint8Array([1, 2, 3]) },
    ]);

    await expect(parseJWLibrary(nodeAdapter, zip)).rejects.toThrow();
  });

  it('should reject unsupported schema version', async () => {
    const manifest = JSON.stringify({
      name: 'test',
      creationDate: '2026-01-01',
      version: 1,
      type: 0,
      userDataBackup: {
        lastModifiedDate: '2026-01-01T00:00:00Z',
        deviceName: 'Test',
        databaseName: 'userData.db',
        hash: 'abc',
        schemaVersion: 99,
      },
    });
    const zip = await nodeAdapter.createZip([
      { path: 'manifest.json', data: new TextEncoder().encode(manifest) },
      { path: 'userData.db', data: new Uint8Array([1, 2, 3]) },
    ]);

    await expect(parseJWLibrary(nodeAdapter, zip)).rejects.toThrow(
      'Unsupported schema version 99',
    );
  });

  it('should reject archive with hash mismatch', async () => {
    const manifest = JSON.stringify({
      name: 'test',
      creationDate: '2026-01-01',
      version: 1,
      type: 0,
      userDataBackup: {
        lastModifiedDate: '2026-01-01T00:00:00Z',
        deviceName: 'Test',
        databaseName: 'userData.db',
        hash: 'wrong_hash',
        schemaVersion: 14,
      },
    });
    const zip = await nodeAdapter.createZip([
      { path: 'manifest.json', data: new TextEncoder().encode(manifest) },
      { path: 'userData.db', data: new Uint8Array([1, 2, 3]) },
    ]);

    await expect(parseJWLibrary(nodeAdapter, zip)).rejects.toThrow(
      'Database hash mismatch',
    );
  });
});
