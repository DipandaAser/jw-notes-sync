import { describe, it, expect } from 'vitest';
import { buildArchive, parseJWLibrary } from '../src/index.js';
import type { DatabaseContents } from '../src/index.js';
import { nodeAdapter } from './node-adapter.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function emptyContents(): DatabaseContents {
  return {
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
}

describe('buildArchive', () => {
  it('should produce a valid .jwlibrary that can be re-parsed', async () => {
    const contents = emptyContents();
    contents.locations = [
      {
        LocationId: 1,
        BookNumber: 1,
        ChapterNumber: 1,
        DocumentId: null,
        Track: null,
        IssueTagNumber: 0,
        KeySymbol: 'nwtsty',
        MepsLanguage: 2,
        Type: 0,
        Title: 'Genesis 1',
      },
    ];
    contents.userMarks = [
      {
        UserMarkId: 1,
        ColorIndex: 1,
        LocationId: 1,
        StyleIndex: 0,
        UserMarkGuid: 'test-guid-001',
        Version: 1,
      },
    ];
    contents.notes = [
      {
        NoteId: 1,
        Guid: 'note-guid-001',
        UserMarkId: 1,
        LocationId: 1,
        Title: 'Test Note',
        Content: 'Some content',
        LastModified: '2025-01-01T00:00:00Z',
        Created: '2025-01-01T00:00:00Z',
        BlockType: 0,
        BlockIdentifier: null,
      },
    ];
    contents.blockRanges = [
      {
        BlockRangeId: 1,
        BlockType: 1,
        Identifier: 1,
        StartToken: 0,
        EndToken: 10,
        UserMarkId: 1,
      },
    ];
    contents.tags = [
      { TagId: 1, Type: 1, Name: 'Study' },
    ];
    contents.tagMaps = [
      { TagMapId: 1, PlaylistItemId: null, LocationId: null, NoteId: 1, TagId: 1, Position: 0 },
    ];

    const archiveBytes = await buildArchive(nodeAdapter, contents);

    // Round-trip: re-parse the archive
    const parsed = await parseJWLibrary(nodeAdapter, archiveBytes);

    expect(parsed.manifest.version).toBe(1);
    expect(parsed.manifest.type).toBe(0);
    expect(parsed.manifest.userDataBackup.schemaVersion).toBe(14);
    expect(parsed.manifest.userDataBackup.deviceName).toBe('JW Notes Sync');
    expect(parsed.manifest.name).toMatch(/^MergedBackup_\d{4}-\d{2}-\d{2}$/);

    expect(parsed.database.locations).toHaveLength(1);
    expect(parsed.database.locations[0]!.Title).toBe('Genesis 1');
    expect(parsed.database.userMarks).toHaveLength(1);
    expect(parsed.database.notes).toHaveLength(1);
    expect(parsed.database.notes[0]!.Content).toBe('Some content');
    expect(parsed.database.blockRanges).toHaveLength(1);
    expect(parsed.database.tags).toHaveLength(1);
    expect(parsed.database.tagMaps).toHaveLength(1);
  });

  it('should produce valid archive with empty data', async () => {
    const contents = emptyContents();

    const archiveBytes = await buildArchive(nodeAdapter, contents);
    const parsed = await parseJWLibrary(nodeAdapter, archiveBytes);

    expect(parsed.database.locations).toHaveLength(0);
    expect(parsed.database.notes).toHaveLength(0);
  });

  it('should use custom device name', async () => {
    const contents = emptyContents();

    const archiveBytes = await buildArchive(nodeAdapter, contents, {
      deviceName: 'My Custom Device',
    });
    const parsed = await parseJWLibrary(nodeAdapter, archiveBytes);

    expect(parsed.manifest.userDataBackup.deviceName).toBe('My Custom Device');
  });

  it('should include media files in the archive', async () => {
    const contents = emptyContents();
    const mediaData = new TextEncoder().encode('fake media data');
    const mediaFiles = new Map<string, Uint8Array>();
    mediaFiles.set('media/song.mp3', mediaData);

    const archiveBytes = await buildArchive(nodeAdapter, contents, { mediaFiles });
    const parsed = await parseJWLibrary(nodeAdapter, archiveBytes);

    expect(parsed.mediaFiles.size).toBe(1);
    expect(parsed.mediaFiles.get('media/song.mp3')).toEqual(mediaData);
  });

  it('should handle bookmarks with FK constraints', async () => {
    const contents = emptyContents();
    contents.locations = [
      {
        LocationId: 1,
        BookNumber: 1,
        ChapterNumber: 1,
        DocumentId: null,
        Track: null,
        IssueTagNumber: 0,
        KeySymbol: 'nwtsty',
        MepsLanguage: 2,
        Type: 0,
        Title: 'Genesis 1',
      },
      {
        LocationId: 2,
        BookNumber: null,
        ChapterNumber: null,
        DocumentId: null,
        Track: null,
        IssueTagNumber: 0,
        KeySymbol: 'nwtsty',
        MepsLanguage: 2,
        Type: 1,
        Title: null,
      },
    ];
    contents.bookmarks = [
      {
        BookmarkId: 1,
        LocationId: 1,
        PublicationLocationId: 2,
        Slot: 0,
        Title: 'My Bookmark',
        Snippet: 'Some text...',
        BlockType: 0,
        BlockIdentifier: null,
      },
    ];

    const archiveBytes = await buildArchive(nodeAdapter, contents);
    const parsed = await parseJWLibrary(nodeAdapter, archiveBytes);

    expect(parsed.database.bookmarks).toHaveLength(1);
    expect(parsed.database.bookmarks[0]!.Title).toBe('My Bookmark');
  });

  it('should handle input fields', async () => {
    const contents = emptyContents();
    contents.locations = [
      {
        LocationId: 1,
        BookNumber: null,
        ChapterNumber: null,
        DocumentId: 12345,
        Track: null,
        IssueTagNumber: 0,
        KeySymbol: 'w',
        MepsLanguage: 2,
        Type: 0,
        Title: 'Watchtower Article',
      },
    ];
    contents.inputFields = [
      { LocationId: 1, TextTag: 'q1', Value: 'My answer' },
      { LocationId: 1, TextTag: 'q2', Value: 'Another answer' },
    ];

    const archiveBytes = await buildArchive(nodeAdapter, contents);
    const parsed = await parseJWLibrary(nodeAdapter, archiveBytes);

    expect(parsed.database.inputFields).toHaveLength(2);
  });

  it('should handle playlist graph', async () => {
    const contents = emptyContents();
    contents.playlistItemAccuracies = [
      { PlaylistItemAccuracyId: 1, Description: 'Accurate' },
    ];
    contents.playlistItems = [
      {
        PlaylistItemId: 1,
        Label: 'Song 1',
        StartTrimOffsetTicks: null,
        EndTrimOffsetTicks: null,
        Accuracy: 1,
        EndAction: 0,
        ThumbnailFilePath: null,
      },
    ];

    const archiveBytes = await buildArchive(nodeAdapter, contents);
    const parsed = await parseJWLibrary(nodeAdapter, archiveBytes);

    expect(parsed.database.playlistItems).toHaveLength(1);
    expect(parsed.database.playlistItems[0]!.Label).toBe('Song 1');
    expect(parsed.database.playlistItemAccuracies).toHaveLength(1);
  });

  it('should round-trip the sample fixture', async () => {
    const samplePath = resolve(__dirname, 'fixtures/sample.jwlibrary');
    const sampleBytes = readFileSync(samplePath);

    // Parse original
    const original = await parseJWLibrary(nodeAdapter, new Uint8Array(sampleBytes));

    // Rebuild
    const rebuiltBytes = await buildArchive(nodeAdapter, original.database, {
      mediaFiles: original.mediaFiles,
    });

    // Re-parse rebuilt
    const rebuilt = await parseJWLibrary(nodeAdapter, rebuiltBytes);

    // Compare data counts
    expect(rebuilt.database.locations).toHaveLength(original.database.locations.length);
    expect(rebuilt.database.notes).toHaveLength(original.database.notes.length);
    expect(rebuilt.database.userMarks).toHaveLength(original.database.userMarks.length);
    expect(rebuilt.database.blockRanges).toHaveLength(original.database.blockRanges.length);
    expect(rebuilt.database.bookmarks).toHaveLength(original.database.bookmarks.length);
    expect(rebuilt.database.tags).toHaveLength(original.database.tags.length);
    expect(rebuilt.database.tagMaps).toHaveLength(original.database.tagMaps.length);
    expect(rebuilt.database.inputFields).toHaveLength(original.database.inputFields.length);
    expect(rebuilt.database.independentMedia).toHaveLength(original.database.independentMedia.length);
    expect(rebuilt.database.playlistItems).toHaveLength(original.database.playlistItems.length);
    expect(rebuilt.mediaFiles.size).toBe(original.mediaFiles.size);
  });
});
