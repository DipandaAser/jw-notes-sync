import type { JWLibraryArchive, DatabaseContents } from '@jw-notes-sync/core';

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

export type Screen = 'import' | 'merge' | 'export';

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
  }
}

export const appState = new AppState();
