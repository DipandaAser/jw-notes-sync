import { create } from 'zustand';
import type { JWLibraryArchive, DatabaseContents, MergeConfig } from '@jw-notes-sync/core';
import { DEFAULT_MERGE_CONFIG } from '@jw-notes-sync/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export type Screen = 'import' | 'merge' | 'export' | 'explorer';

export interface MergeHistoryEntry {
  id: string;
  date: string;
  sources: { deviceName: string; fileName: string }[];
  stats: MergeResult['stats'];
  config: MergeConfig;
}

const HISTORY_KEY = 'jw-notes-sync-merge-history';
const CONFIG_KEY = 'jw-notes-sync-merge-config';

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

interface AppStore {
  screen: Screen;
  backups: ImportedBackup[];
  mergeStatus: MergeStatus;
  mergeProgress: MergeProgress;
  mergeResult: MergeResult | null;
  mergeError: string | null;
  archiveBytes: Uint8Array | null;
  mergeConfig: MergeConfig;
  mergeHistory: MergeHistoryEntry[];
  explorerData: DatabaseContents | null;
  explorerLabel: string;

  addBackup: (backup: ImportedBackup) => void;
  removeBackup: (id: string) => void;
  goTo: (screen: Screen) => void;
  canMerge: () => boolean;
  setMergeStatus: (status: MergeStatus) => void;
  setMergeProgress: (progress: MergeProgress) => void;
  setMergeResult: (result: MergeResult) => void;
  setMergeError: (error: string | null) => void;
  setArchiveBytes: (bytes: Uint8Array) => void;
  setMergeConfig: (config: MergeConfig) => void;
  addMergeHistory: (entry: MergeHistoryEntry) => void;
  clearMergeHistory: () => void;
  openExplorer: (data: DatabaseContents, label: string) => void;
  closeExplorer: () => void;
  loadPersistedConfig: () => Promise<void>;
  reset: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  screen: 'import',
  backups: [],
  mergeStatus: 'idle',
  mergeProgress: { step: '', percent: 0, steps: [] },
  mergeResult: null,
  mergeError: null,
  archiveBytes: null,
  mergeConfig: { ...DEFAULT_MERGE_CONFIG },
  mergeHistory: [],
  explorerData: null,
  explorerLabel: '',

  addBackup: (backup) => set((s) => ({ backups: [...s.backups, backup] })),
  removeBackup: (id) => set((s) => ({ backups: s.backups.filter((b) => b.id !== id) })),
  goTo: (screen) => set({ screen }),
  canMerge: () => get().backups.length >= 2,
  setMergeStatus: (status) => set({ mergeStatus: status }),
  setMergeProgress: (progress) => set({ mergeProgress: progress }),
  setMergeResult: (result) => set({ mergeResult: result }),
  setMergeError: (error) => set({ mergeError: error }),
  setArchiveBytes: (bytes) => set({ archiveBytes: bytes }),

  setMergeConfig: (config) => {
    set({ mergeConfig: config });
    AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  },

  addMergeHistory: (entry) => {
    const updated = [entry, ...get().mergeHistory].slice(0, 20);
    set({ mergeHistory: updated });
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  },

  clearMergeHistory: () => {
    set({ mergeHistory: [] });
    AsyncStorage.removeItem(HISTORY_KEY);
  },

  openExplorer: (data, label) => set({ explorerData: data, explorerLabel: label }),
  closeExplorer: () => set({ explorerData: null, explorerLabel: '' }),

  loadPersistedConfig: async () => {
    try {
      const [configRaw, historyRaw] = await Promise.all([
        AsyncStorage.getItem(CONFIG_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
      ]);
      if (configRaw) set({ mergeConfig: JSON.parse(configRaw) });
      if (historyRaw) set({ mergeHistory: JSON.parse(historyRaw) });
    } catch { /* ignore */ }
  },

  reset: () =>
    set({
      screen: 'import',
      backups: [],
      mergeStatus: 'idle',
      mergeProgress: { step: '', percent: 0, steps: [] },
      mergeResult: null,
      mergeError: null,
      archiveBytes: null,
      explorerData: null,
      explorerLabel: '',
    }),
}));
