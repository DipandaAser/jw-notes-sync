import type { JWLibraryArchive, DatabaseContents, MergeConfig } from '@jw-notes-sync/core';
import { DEFAULT_MERGE_CONFIG } from '@jw-notes-sync/core';
import {
  saveBackup,
  deleteBackup,
  saveMergedBackup,
  saveMergeConfig as persistMergeConfig,
  loadMergeConfig,
  listBackupMetas,
  loadBackupBytes,
  getSourceOfTruth,
  clearAllBackups,
  getStorageUsage,
  type BackupMeta,
} from '$lib/storage';
import { parseJWLibrary } from '@jw-notes-sync/core';
import { webAdapter } from '$lib/adapter';

export interface ImportedBackup {
  id: string;
  fileName: string;
  deviceName: string;
  date: string;
  archive: JWLibraryArchive;
  stats: {
    notes: number;
    highlights: number;
    bookmarks: number;
    tags: number;
  };
}

export type Tab = 'home' | 'settings';

export type Screen = 'library' | 'import' | 'merge' | 'export' | 'explore';

export type MergeMode = 'library' | 'quick';

export type MergeStatus = 'idle' | 'merging' | 'done' | 'error';

export interface MergeProgress {
  step: string;
  percent: number;
  steps: { name: string; status: 'pending' | 'current' | 'done' }[];
}

export interface MergeResult {
  contents: DatabaseContents;
  mediaFiles: Map<string, Uint8Array>;
  stats: {
    notes: number;
    highlights: number;
    bookmarks: number;
    tags: number;
    locations: number;
    inputFields: number;
  };
}

export interface MergeHistoryEntry {
  id: string;
  date: string;
  sources: { deviceName: string; fileName: string }[];
  stats: MergeResult['stats'];
  config: MergeConfig;
  dryRun: boolean;
}

const ONBOARDING_KEY = 'jw-notes-sync-onboarding-seen';
const HISTORY_KEY = 'jw-notes-sync-merge-history';

function loadHistory(): MergeHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: MergeHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

class AppState {
  tab = $state<Tab>('home');
  screen = $state<Screen>('library');
  mergeMode = $state<MergeMode>('library');
  sourceOfTruth = $state<BackupMeta | null>(null);
  backups = $state<ImportedBackup[]>([]);
  mergeStatus = $state<MergeStatus>('idle');
  mergeProgress = $state<MergeProgress>({
    step: '',
    percent: 0,
    steps: [],
  });
  mergeResult = $state<MergeResult | null>(null);
  mergeError = $state<string | null>(null);
  theme = $state<'light' | 'dark'>('light');
  archiveBytes = $state<Uint8Array | null>(null);
  mergeConfig = $state<MergeConfig>({ ...DEFAULT_MERGE_CONFIG });
  dryRun = $state<boolean>(false);
  mergeHistory = $state<MergeHistoryEntry[]>(loadHistory());
  showOnboarding = $state<boolean>(
    typeof window !== 'undefined' ? !localStorage.getItem(ONBOARDING_KEY) : false,
  );
  onboardingStep = $state<number>(0);
  recentFiles = $state<BackupMeta[]>([]);
  storageUsed = $state<number>(0);
  storageQuota = $state<number>(0);
  explorerData = $state<DatabaseContents | null>(null);
  explorerLabel = $state<string>('');
  previousScreen = $state<Screen>('import');

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jw-notes-sync-theme');
      if (saved === 'dark' || saved === 'light') {
        this.theme = saved;
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.theme = 'dark';
      }
      document.documentElement.setAttribute('data-theme', this.theme);
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem('jw-notes-sync-theme', this.theme);
  }

  addBackup(backup: ImportedBackup, rawBytes?: Uint8Array) {
    this.backups = [...this.backups, backup];
    if (rawBytes) {
      saveBackup(backup.id, rawBytes, {
        id: backup.id,
        fileName: backup.fileName,
        deviceName: backup.deviceName,
        date: backup.date,
        stats: backup.stats,
      }).then(() => this.refreshStorage());
    }
  }

  removeBackup(id: string) {
    this.backups = this.backups.filter((b) => b.id !== id);
    deleteBackup(id).then(() => this.refreshStorage());
  }

  async refreshStorage() {
    this.recentFiles = await listBackupMetas();
    const usage = await getStorageUsage();
    this.storageUsed = usage.used;
    this.storageQuota = usage.quota;
  }

  async restoreBackup(meta: BackupMeta): Promise<boolean> {
    const bytes = await loadBackupBytes(meta.id);
    if (!bytes) return false;
    try {
      const archive = await parseJWLibrary(webAdapter, bytes);
      const db = archive.database;
      const backup: ImportedBackup = {
        id: meta.id,
        fileName: meta.fileName,
        deviceName: meta.deviceName,
        date: meta.date,
        archive,
        stats: {
          notes: db.notes.length,
          highlights: db.userMarks.length,
          bookmarks: db.bookmarks.length,
          tags: db.tags.length,
        },
      };
      this.backups = [...this.backups, backup];
      return true;
    } catch {
      return false;
    }
  }

  async clearStorage() {
    await clearAllBackups();
    this.sourceOfTruth = null;
    await this.refreshStorage();
  }

  async initStorage() {
    await this.refreshStorage();
    this.sourceOfTruth = await getSourceOfTruth();
    const savedConfig = await loadMergeConfig();
    if (savedConfig) {
      this.mergeConfig = savedConfig as MergeConfig;
    }
  }

  saveMergeConfig() {
    persistMergeConfig({ ...this.mergeConfig });
  }

  goToTab(tab: Tab) {
    this.tab = tab;
    if (tab === 'home') {
      this.screen = 'library';
    }
  }

  goTo(screen: Screen) {
    this.tab = 'home';
    this.screen = screen;
  }

  openExplorer(data: DatabaseContents, label: string) {
    this.explorerData = data;
    this.explorerLabel = label;
    this.previousScreen = this.screen;
    this.goTo('explore');
  }

  closeExplorer() {
    this.explorerData = null;
    this.explorerLabel = '';
    // After a dry-run preview, reset merge state so the merge screen isn't stuck
    if (this.dryRun && this.mergeStatus === 'done') {
      this.mergeStatus = 'idle';
      this.mergeResult = null;
      this.mergeProgress = { step: '', percent: 0, steps: [] };
    }
    this.goTo(this.previousScreen);
  }

  completeOnboarding() {
    this.showOnboarding = false;
    this.onboardingStep = 0;
    localStorage.setItem(ONBOARDING_KEY, '1');
  }

  resetOnboarding() {
    localStorage.removeItem(ONBOARDING_KEY);
    this.showOnboarding = true;
    this.onboardingStep = 0;
  }

  addMergeHistory(entry: MergeHistoryEntry) {
    this.mergeHistory = [entry, ...this.mergeHistory].slice(0, 20);
    saveHistory(this.mergeHistory);
  }

  clearMergeHistory() {
    this.mergeHistory = [];
    saveHistory([]);
  }

  canMerge(): boolean {
    if (this.mergeMode === 'library' && this.sourceOfTruth && this.backups.length >= 1) {
      return true;
    }
    return this.backups.length >= 2;
  }

  reset() {
    this.tab = 'home';
    this.screen = 'library';
    this.backups = [];
    this.mergeMode = 'library';
    this.mergeStatus = 'idle';
    this.mergeProgress = { step: '', percent: 0, steps: [] };
    this.mergeResult = null;
    this.mergeError = null;
    this.archiveBytes = null;
    this.explorerData = null;
    this.explorerLabel = '';
    this.previousScreen = 'library';
  }

  /** Start a library merge: load the truth as backup A, new file becomes B. */
  async startLibraryMerge(newBackup: ImportedBackup): Promise<boolean> {
    if (!this.sourceOfTruth) return false;
    const truthBytes = await loadBackupBytes(this.sourceOfTruth.id);
    if (!truthBytes) return false;
    const truthArchive = await parseJWLibrary(webAdapter, truthBytes);
    const truthBackup: ImportedBackup = {
      id: this.sourceOfTruth.id,
      fileName: this.sourceOfTruth.fileName,
      deviceName: this.sourceOfTruth.deviceName,
      date: this.sourceOfTruth.date,
      archive: truthArchive,
      stats: this.sourceOfTruth.stats,
    };
    this.backups = [truthBackup, newBackup];
    this.mergeMode = 'library';
    this.goTo('merge');
    return true;
  }

  /** Start quick merge mode (standalone, no persistence). */
  startQuickMerge() {
    this.backups = [];
    this.mergeMode = 'quick';
    this.goTo('import');
  }

  /** Refresh source of truth from storage. */
  async refreshSourceOfTruth() {
    this.sourceOfTruth = await getSourceOfTruth();
  }
}

export const appState = new AppState();
