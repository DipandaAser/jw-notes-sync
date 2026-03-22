import type { JWLibraryArchive, DatabaseContents, MergeConfig } from '@jw-notes-sync/core';
import { DEFAULT_MERGE_CONFIG } from '@jw-notes-sync/core';

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

export type Screen = 'import' | 'merge' | 'export' | 'explore';

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
  screen = $state<Screen>('import');
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

  addBackup(backup: ImportedBackup) {
    this.backups = [...this.backups, backup];
  }

  removeBackup(id: string) {
    this.backups = this.backups.filter((b) => b.id !== id);
  }

  goToTab(tab: Tab) {
    this.tab = tab;
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

  addMergeHistory(entry: MergeHistoryEntry) {
    this.mergeHistory = [entry, ...this.mergeHistory].slice(0, 20);
    saveHistory(this.mergeHistory);
  }

  clearMergeHistory() {
    this.mergeHistory = [];
    saveHistory([]);
  }

  canMerge(): boolean {
    return this.backups.length >= 2;
  }

  reset() {
    this.tab = 'home';
    this.screen = 'import';
    this.backups = [];
    this.mergeStatus = 'idle';
    this.mergeProgress = { step: '', percent: 0, steps: [] };
    this.mergeResult = null;
    this.mergeError = null;
    this.archiveBytes = null;
    this.explorerData = null;
    this.explorerLabel = '';
    this.previousScreen = 'import';
  }
}

export const appState = new AppState();
