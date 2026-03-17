# JW Notes Sync

A privacy-first web and mobile app that lets JW Library users **merge and sync** their annotations, notes, bookmarks, highlights, tags, and playlists across multiple devices — without losing any data.

## The Problem

JW Library allows exporting your data as a `.jwlibrary` backup file. But importing a backup **overwrites** all existing data on the target device. If you use multiple devices (phone, tablet, PC), you're forced to choose one device's data over another.

## The Solution

JW Notes Sync lets you:

1. **Import** multiple `.jwlibrary` backup files
2. **Preview & compare** the data from each device side by side
3. **Merge** them intelligently — keeping all unique notes, bookmarks, highlights, and tags from every device
4. **Resolve conflicts** when the same item was edited differently on two devices
5. **Export** a single merged `.jwlibrary` file ready to import on any device
6. **Sync** automatically via Google Drive or iCloud (optional, Phase 3)

## Privacy & Architecture

- **No backend.** Zero. Nothing is sent to any server we control.
- **Offline-first.** The entire app runs in your browser or on your device.
- **Your data stays yours.** Cloud sync uses private app-scoped storage (Google Drive AppData / iCloud CloudKit) — only your own account can access it.
- **Open source.** You can verify exactly what the code does.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shared core | Pure TypeScript (packages/core) |
| Web app | SvelteKit |
| Mobile app | React Native (Expo) |
| SQLite (browser) | sql.js (WASM) |
| SQLite (mobile) | expo-sqlite |
| Archive handling | JSZip (web) / react-native-zip-archive (mobile) |
| UI (web) | Tailwind CSS 4 + Bits UI |
| State (web) | Svelte stores |
| State (mobile) | Zustand |
| Cloud sync | Google Drive API v3 (DRIVE_APPDATA) / CloudKit JS |
| Local persistence | OPFS + IndexedDB fallback (web) / expo-file-system (mobile) |

## Project Phases

### Phase 1 — Core Merge Engine (Web)
File import/export, database parsing, merge logic, conflict resolution, merged file export.

### Phase 2 — Rich UI & Data Explorer
Visual diff, annotation browser, tag manager, search, statistics dashboard.

### Phase 3 — Cloud Sync
Google Drive AppData sync, iCloud CloudKit sync, automatic background sync.

### Phase 4 — Mobile App
React Native (Expo) app for Android & iOS, native file picking, share-sheet integration.

See the full [Project Plan](./PLAN.md) for detailed breakdowns.

## Development

```bash
# Install dependencies
pnpm install

# Start web dev server
pnpm --filter @jw-notes-sync/web dev

# Start mobile dev server
pnpm --filter @jw-notes-sync/mobile start

# Run core tests
pnpm --filter @jw-notes-sync/core test

# Build web for production
pnpm --filter @jw-notes-sync/web build
```

## Internationalization (i18n)

The app supports **English** (default) and **French**, with a shared translation system across both platforms.

### Architecture

```text
packages/i18n/          # Shared message source
├── src/locales/fr.json # French translations (~70 keys)
├── src/locales/en.json # English translations
└── src/index.ts        # Exports messages, types, locale config
```

Both apps import `@jw-notes-sync/i18n` for translation strings and use **i18next** as the runtime:

| Platform | Libraries                             | Detection            |
|----------|---------------------------------------|----------------------|
| Web      | `i18next` + Svelte 5 reactive `t()`   | `navigator.language` |
| Mobile   | `i18next` + `react-i18next`           | `expo-localization`  |

### Language Detection Logic

1. On startup, the app detects the device/browser language
2. If the user previously chose a language manually (in Settings), that preference is restored from storage (`localStorage` on web, `AsyncStorage` on mobile)
3. When the app regains focus (tab visibility change on web, foreground on mobile), the device language is re-checked — but only if the user hasn't set a manual preference

### Adding a New Language

1. Create `packages/i18n/src/locales/{code}.json` (copy `fr.json` as template)
2. Add the locale code to `supportedLocales` in `packages/i18n/src/index.ts`
3. Register the resource in both `apps/web/src/lib/i18n.svelte.ts` and `apps/mobile/src/lib/i18n.ts`
4. Add the language label to the Settings screen on both platforms

## .jwlibrary File Format

A `.jwlibrary` file is a DEFLATE-compressed ZIP archive containing:
- `manifest.json` — metadata (device name, date, schema version, DB hash)
- `userData.db` — SQLite database (schema v14) with 18 tables, 13 indexes, and 23 triggers
- Media files — images and thumbnails referenced by playlists

### Key Database Tables
| Table | Purpose | Merge Key |
|-------|---------|-----------|
| `Note` | User notes with title/content | `Guid` |
| `UserMark` | Highlights/underlines | `UserMarkGuid` |
| `Bookmark` | Saved locations | `PublicationLocationId + Slot` |
| `Tag` | User-created tags/folders | `Type + Name` |
| `TagMap` | Tag-to-item associations | Composite FK |
| `Location` | Publication/chapter references | Natural key (Book+Chapter+KeySymbol+Lang+Type) |
| `BlockRange` | Highlight text ranges | `UserMarkId` parent |
| `InputField` | Form field values | `LocationId + TextTag` |
| `PlaylistItem` | Media playlist entries | `Label` + media refs |

### Android Compatibility

JW Library on Android is strict about the archive format. The generated file must have:

- `PRAGMA user_version = 14` and `journal_mode = delete` (not WAL)
- All 13 indexes and 23 triggers present in the schema
- DEFLATE-compressed ZIP (not STORE)
- `creationDate` as date-only (`YYYY-MM-DD`), `name` with `.jwlibrary` extension
- Correct SHA-256 hash of the raw database bytes in the manifest

See the full [Technical Notes in PLAN.md](./PLAN.md#jwlibrary-file-format--technical-notes) for details.

## License

MIT
