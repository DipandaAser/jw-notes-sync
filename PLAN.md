# JW Notes Sync — Project Plan

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         UI Layer                                 │
│                                                                  │
│   apps/web (SvelteKit)          apps/mobile (React Native/Expo)  │
│   Tailwind CSS 4 + Bits UI      React Native UI                  │
│   Svelte stores                  Zustand                         │
├──────────────────────────────────────────────────────────────────┤
│                    Platform Adapter Interface                     │
│   WebAdapter (sql.js, JSZip,     NativeAdapter (expo-sqlite,     │
│    OPFS, File System API)         expo-file-system, expo-sharing)│
├──────────────────────────────────────────────────────────────────┤
│                  Core Engine (packages/core)                      │
│                  Pure TypeScript — zero UI deps                   │
│                                                                  │
│   JWLib Parser │ Merge Engine │ Conflict Resolver                │
│   Archive Builder │ Diff Engine │ Schema Validator               │
├──────────────────────────────────────────────────────────────────┤
│                      Storage Layer                               │
│   Web: OPFS + IndexedDB fallback                                │
│   Mobile: expo-file-system (device storage)                      │
└──────────────────────────────────────────────────────────────────┘
```

The core engine is **pure TypeScript with no UI dependencies**. Both the SvelteKit web app and the React Native mobile app consume it through a **platform adapter interface** that abstracts SQLite, ZIP, and file I/O differences.

### Platform Adapter Pattern

```typescript
// packages/core/src/platform.ts
export interface PlatformAdapter {
  openDatabase(bytes: Uint8Array): Promise<Database>
  executeQuery(db: Database, sql: string, params?: unknown[]): Promise<Row[]>
  closeDatabase(db: Database): Promise<void>
  extractZip(bytes: Uint8Array): Promise<ZipContents>
  createZip(entries: ZipEntry[]): Promise<Uint8Array>
  hashSHA256(data: Uint8Array): Promise<string>
}

// apps/web/src/lib/adapter.ts — implements via sql.js + JSZip
// apps/mobile/src/adapter.ts  — implements via expo-sqlite + react-native-zip-archive
```

---

## Phase 1 — Core Merge Engine + Minimal Web UI

**Goal:** Users can import 2+ `.jwlibrary` files, merge them, and export a valid merged file.

### 1.1 Project Setup
- [ ] Initialize pnpm workspace with `packages/core` and `apps/web`
- [ ] Set up `packages/core` with TypeScript (strict mode) + Vitest
- [ ] Initialize SvelteKit app in `apps/web`
- [ ] Configure Tailwind CSS 4 + Bits UI
- [ ] Configure ESLint + Prettier (Svelte plugin)
- [ ] CI with GitHub Actions (lint + test + build)

### 1.2 Platform Adapter (`packages/core/platform`)
- [ ] Define `PlatformAdapter` interface (SQLite, ZIP, hashing)
- [ ] Define `Database` and `Row` types abstracting SQLite operations
- [ ] Web adapter: sql.js (WASM) + JSZip + Web Crypto API
- [ ] Adapter injection pattern (core functions receive adapter as parameter)

### 1.3 .jwlibrary Parser (`packages/core/parser`)
- [ ] ZIP extraction via platform adapter
- [ ] `manifest.json` parsing and validation (Zod schema)
- [ ] SQLite database loading via platform adapter
- [ ] Type-safe table models for all 18 tables (generated from schema)
- [ ] Media file extraction and cataloging
- [ ] Schema version validation (currently v14)
- [ ] Round-trip test: parse → rebuild → binary-compare

### 1.4 Merge Engine (`packages/core/merge`)
- [ ] **Location deduplication** — match Locations across DBs by natural key (`BookNumber + ChapterNumber + KeySymbol + MepsLanguage + Type`) and remap IDs
- [ ] **Note merge** — match by `Guid`, keep newer `LastModified` for conflicts, union for unique notes
- [ ] **UserMark merge** — match by `UserMarkGuid`, keep newer version, remap LocationId
- [ ] **BlockRange merge** — follow parent UserMark, preserve ranges
- [ ] **Bookmark merge** — match by `PublicationLocationId + Slot`, keep newer
- [ ] **Tag merge** — match by `Type + Name`, union
- [ ] **TagMap merge** — remap all FKs after parent merges, deduplicate
- [ ] **InputField merge** — match by `LocationId + TextTag`, keep newer
- [ ] **Playlist merge** — full graph merge (PlaylistItem → markers → maps)
- [ ] **IndependentMedia merge** — deduplicate by `Hash`, remap references
- [ ] **Manifest generation** — new manifest with merged metadata + SHA-256 hash
- [ ] **ID remapping engine** — centralized old→new ID mapping across all tables
- [ ] **Conflict detection** — identify items modified on both sides with different content

### 1.5 Archive Builder (`packages/core/builder`)
- [ ] Rebuild valid SQLite database from merged data
- [ ] Repack as ZIP with correct structure via platform adapter
- [ ] Include merged media files
- [ ] Generate valid `manifest.json` with correct hash
- [ ] Validate output can be imported by JW Library (manual test)

### 1.6 Minimal Web UI (SvelteKit)
- [ ] **Landing page** — explain what the app does, single CTA
- [ ] **Import dropzone** — drag & drop or file picker for `.jwlibrary` files
- [ ] **File list** — show imported backups with device name, date, stats (note count, bookmark count, etc.)
- [ ] **Merge button** — one-click merge with progress indicator
- [ ] **Conflict resolution modal** — side-by-side diff for conflicting items, pick A/B/both (Bits UI Dialog)
- [ ] **Export button** — download merged `.jwlibrary` file
- [ ] **Toast notifications** for success/error states (Bits UI Toast)

### 1.7 Testing
- [ ] Unit tests for each merge strategy (Location, Note, UserMark, etc.)
- [ ] Integration test: merge two real `.jwlibrary` files, validate output schema
- [ ] Property-based tests for ID remapping (no orphans, no broken FKs)
- [ ] Snapshot tests for conflict detection
- [ ] Platform adapter contract tests (run against both Web and Native adapters)

---

## Phase 2 — Rich UI & Data Explorer

**Goal:** Users can browse, search, and understand their data before and after merge.

### 2.1 Design System
- [ ] Color palette, typography scale, spacing system (Tailwind config)
- [ ] Light/dark mode with system preference detection
- [ ] Bits UI component configuration: Dialog, Popover, Tabs, Combobox, Select, Tooltip
- [ ] Responsive breakpoints: mobile-first (375px → 1440px)
- [ ] Motion/animation tokens (Svelte transitions: fly, fade, slide)
- [ ] Accessibility audit (WCAG 2.1 AA)

### 2.2 Data Explorer
- [ ] **Notes browser** — filterable list with full-text search, grouped by publication
- [ ] **Highlights viewer** — color-coded highlights with source text context
- [ ] **Bookmarks list** — sorted by publication, with snippets
- [ ] **Tag manager** — tree view of tags with item counts, bulk operations
- [ ] **Playlist viewer** — media items with markers and verse references
- [ ] **Statistics dashboard** — total counts, items per device, merge summary

### 2.3 Visual Diff
- [ ] Side-by-side comparison of two backups
- [ ] Highlighted additions, deletions, modifications
- [ ] Inline diff for note content changes
- [ ] Filter by change type (added / modified / deleted / conflict)

### 2.4 Merge Configuration
- [ ] Merge strategy selector per data type (keep newest / keep all / manual)
- [ ] Preset profiles (e.g., "keep everything", "prefer device A", "manual review")
- [ ] Dry-run mode — preview merge result without exporting
- [ ] Merge history — log of past merges stored locally

### 2.5 Onboarding
- [ ] First-time tutorial overlay (3-4 steps)
- [ ] Contextual help tooltips (Bits UI Tooltip)
- [ ] Sample `.jwlibrary` file for users to try without their own data
- [ ] FAQ / help section

### 2.6 Local Persistence
- [ ] Store imported backups in OPFS (or IndexedDB fallback)
- [ ] Auto-save merge configurations
- [ ] Recent files list
- [ ] Storage usage indicator + cleanup

---

## Phase 3 — Cloud Sync

**Goal:** Automatic sync across devices via user's own cloud storage.

### 3.1 Google Drive Integration
- [ ] OAuth 2.0 flow (client-side only, no server)
- [ ] DRIVE_APPDATA scope — files invisible to user, private to app
- [ ] Upload merged backup to AppData folder
- [ ] Download latest backup from AppData
- [ ] Conflict detection: compare local vs remote `lastModifiedDate`
- [ ] Incremental sync: only upload if local is newer

### 3.2 iCloud Integration
- [ ] CloudKit JS setup (Apple Developer account required)
- [ ] CloudKit container configuration
- [ ] Upload/download backup records
- [ ] Conflict resolution via CloudKit's server change tokens

### 3.3 Sync Manager
- [ ] Background sync with configurable interval
- [ ] Sync status indicator (synced / syncing / conflict / offline)
- [ ] Manual sync trigger
- [ ] Sync log / history
- [ ] Multi-provider support (Google + iCloud simultaneously)

### 3.4 Auto-Merge on Sync
- [ ] When remote is newer: download → merge with local → prompt user
- [ ] When local is newer: upload automatically (or prompt)
- [ ] When both changed: full conflict resolution flow

---

## Phase 4 — Mobile App (React Native / Expo)

**Goal:** Native Android & iOS apps sharing the same core engine.

### 4.1 Expo Setup
- [ ] Initialize Expo project in `apps/mobile`
- [ ] Configure Expo Router for navigation
- [ ] Native adapter: `expo-sqlite` for SQLite operations
- [ ] `expo-file-system` for file I/O
- [ ] `expo-document-picker` for `.jwlibrary` file import
- [ ] `expo-sharing` for export
- [ ] Share sheet / intent filter to receive `.jwlibrary` files directly from JW Library

### 4.2 Mobile UI
- [ ] Re-implement key screens in React Native (not shared with SvelteKit)
- [ ] Import flow with file picker
- [ ] Merge progress + conflict resolution
- [ ] Data explorer (notes, highlights, bookmarks, tags)
- [ ] Settings (sync configuration, storage management)

### 4.3 Mobile Cloud Sync
- [ ] Google Drive: `@react-native-google-signin` + Drive API
- [ ] iCloud: native CloudKit via Expo module or bare workflow
- [ ] Background sync via `expo-background-fetch`

### 4.4 Distribution
- [ ] Google Play Store listing
- [ ] Apple App Store listing (requires Apple Developer account)
- [ ] F-Droid listing (optional, for privacy-conscious users)
- [ ] EAS Build configuration for CI/CD

---

## Merge Algorithm Detail

### ID Remapping Strategy

Since each `.jwlibrary` database uses auto-increment IDs, the same ID in two databases refers to different entities. The merge must:

1. **Build a unified Location table first** (it's the central reference)
2. **Create an ID mapping** for each source DB: `oldLocationId → newLocationId`
3. **Process tables in dependency order:**
   ```
   Location (no deps)
   → Tag (no deps)
   → IndependentMedia (no deps)
   → UserMark (depends on Location)
   → BlockRange (depends on UserMark)
   → Note (depends on Location, UserMark)
   → Bookmark (depends on Location)
   → InputField (depends on Location)
   → PlaylistItem (depends on IndependentMedia)
   → PlaylistItemLocationMap (depends on PlaylistItem, Location)
   → PlaylistItemIndependentMediaMap (depends on PlaylistItem, IndependentMedia)
   → PlaylistItemMarker (depends on PlaylistItem)
   → PlaylistItemMarkerBibleVerseMap (depends on PlaylistItemMarker)
   → PlaylistItemMarkerParagraphMap (depends on PlaylistItemMarker)
   → TagMap (depends on Tag, Location, Note, PlaylistItem)
   ```

### Conflict Resolution Rules

| Entity | Match Key | Strategy | Detail |
|--------|-----------|----------|--------|
| Location | `BookNumber + ChapterNumber + KeySymbol + MepsLanguage + Type` | Merge as same entity | Match by natural key, keep whichever has a non-null Title |
| Note | `Guid` | Keep both | If same Guid exists on both sides with different content, concatenate both versions with a separator |
| UserMark | `UserMarkGuid` | Keep newer | Whichever has the higher `Version` number wins |
| BlockRange | Parent `UserMarkId` | Follow parent | Keep the BlockRange from whichever device's UserMark was kept |
| Bookmark | `PublicationLocationId + Slot` | Keep both | If slots collide, shift the second bookmark to the next available slot |
| Tag | `Type + Name` | Union | Keep all tags from both devices, deduplicate by `Type + Name` |
| TagMap | Composite FK | Union | Keep all tag associations from both devices |
| InputField | `LocationId + TextTag` | Keep both | Concatenate both values with a separator |
| IndependentMedia | `Hash` | Keep both | Deduplicate by hash; if same filename but different hash, keep both files |
| PlaylistItem | `Label` + media refs | Keep both | Treat as separate playlist items |
| PlaylistItemMarker | `PlaylistItemId + StartTimeTicks` | Follow parent | Keep markers from whichever device's PlaylistItem they belong to |
| PlaylistItemLocationMap | `PlaylistItemId + LocationId` | Follow parent | Follows parent PlaylistItem |
| PlaylistItemIndependentMediaMap | `PlaylistItemId + IndependentMediaId` | Follow parent | Follows parent PlaylistItem |
| PlaylistItemMarkerBibleVerseMap | `PlaylistItemMarkerId + VerseId` | Follow parent | Follows parent PlaylistItemMarker |
| PlaylistItemMarkerParagraphMap | `PlaylistItemMarkerId + MepsDocumentId + ...` | Follow parent | Follows parent PlaylistItemMarker |

---

## File Structure

```
jw-notes-sync/
├── packages/
│   └── core/                        # Pure TS — no UI dependencies
│       ├── src/
│       │   ├── platform.ts          # PlatformAdapter interface
│       │   ├── parser/              # .jwlibrary ZIP + SQLite parsing
│       │   ├── merge/               # Merge engine + conflict resolution
│       │   ├── builder/             # Rebuild .jwlibrary from merged data
│       │   ├── models/              # TypeScript types for all 18 tables
│       │   ├── schema/              # Schema validation (Zod)
│       │   └── index.ts
│       ├── tests/
│       └── package.json
├── apps/
│   ├── web/                         # SvelteKit
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── adapter.ts       # Web PlatformAdapter (sql.js + JSZip)
│   │   │   │   ├── components/      # Svelte components (Bits UI based)
│   │   │   │   └── stores/          # Svelte stores
│   │   │   ├── routes/              # SvelteKit file-based routes
│   │   │   └── app.html
│   │   ├── static/
│   │   ├── svelte.config.js
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   └── mobile/                      # React Native (Expo)
│       ├── src/
│       │   ├── adapter.ts           # Native PlatformAdapter (expo-sqlite)
│       │   ├── components/          # React Native components
│       │   ├── screens/             # App screens
│       │   └── stores/              # Zustand stores
│       ├── app.json
│       └── package.json
├── PLAN.md
├── README.md
├── CLAUDE.md
└── pnpm-workspace.yaml
```

---

## Non-Goals (Explicit)

- No user accounts or authentication on our side
- No server-side processing or storage
- No analytics or telemetry
- No modification of JW Library itself
- No access to JW Library's internal APIs
- No storing or caching of copyrighted publication content
