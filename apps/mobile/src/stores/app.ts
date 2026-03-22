import { create } from 'zustand';
import type { JWLibraryArchive, DatabaseContents, MergeConfig } from '@jw-notes-sync/core';
import { DEFAULT_MERGE_CONFIG, parseJWLibrary } from '@jw-notes-sync/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveBackup,
  deleteBackup as deleteStoredBackup,
  saveMergedBackup,
  loadBackupBytes,
  listBackupMetas,
  getSourceOfTruth,
  clearAllBackups,
  getStorageUsage,
  type BackupMeta,
} from '../lib/storage';
import { nativeAdapter } from '../adapter';

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
export type MergeMode = 'library' | 'quick';

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
  mergeMode: MergeMode;
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
  sourceOfTruth: BackupMeta | null;
  recentFiles: BackupMeta[];
  storageUsed: number;
  pendingBackupIds: string[];

  addBackup: (backup: ImportedBackup, rawBytes?: Uint8Array) => void;
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
  initStorage: () => Promise<void>;
  refreshStorage: () => Promise<void>;
  refreshSourceOfTruth: () => Promise<void>;
  startLibraryMerge: (newBackup: ImportedBackup) => Promise<boolean>;
  startQuickMerge: () => void;
  clearStorage: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  screen: 'import',
  mergeMode: 'library',
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
  sourceOfTruth: null,
  recentFiles: [],
  storageUsed: 0,
  pendingBackupIds: [],

  addBackup: (backup, rawBytes) => {
    set((s) => ({ backups: [...s.backups, backup] }));
    if (rawBytes) {
      set((s) => ({ pendingBackupIds: [...s.pendingBackupIds, backup.id] }));
      saveBackup(backup.id, rawBytes, {
        id: backup.id,
        fileName: backup.fileName,
        deviceName: backup.deviceName,
        date: backup.date,
        stats: backup.stats,
      }).then(() => get().refreshStorage());
    }
  },

  removeBackup: (id) => {
    set((s) => ({ backups: s.backups.filter((b) => b.id !== id) }));
    deleteStoredBackup(id).catch(() => {}).then(() => get().refreshStorage());
  },

  goTo: (screen) => set({ screen }),

  canMerge: () => {
    const s = get();
    if (s.mergeMode === 'library' && s.sourceOfTruth && s.backups.length >= 1) return true;
    return s.backups.length >= 2;
  },

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

  initStorage: async () => {
    await get().refreshStorage();
    await get().refreshSourceOfTruth();
    await get().loadPersistedConfig();
  },

  refreshStorage: async () => {
    const recentFiles = await listBackupMetas();
    const storageUsed = await getStorageUsage();
    set({ recentFiles, storageUsed });
  },

  refreshSourceOfTruth: async () => {
    const sourceOfTruth = await getSourceOfTruth();
    set({ sourceOfTruth });
  },

  startLibraryMerge: async (newBackup) => {
    const sot = get().sourceOfTruth;
    if (!sot) return false;
    const truthBytes = await loadBackupBytes(sot.id);
    if (!truthBytes) return false;
    const truthArchive = await parseJWLibrary(nativeAdapter, truthBytes);
    const truthBackup: ImportedBackup = {
      id: sot.id,
      fileName: sot.fileName,
      deviceName: sot.deviceName,
      date: sot.date,
      archive: truthArchive,
      stats: sot.stats,
    };
    set({ backups: [truthBackup, newBackup], mergeMode: 'library' });
    return true;
  },

  startQuickMerge: () => {
    set({
      backups: [],
      mergeMode: 'quick',
      mergeStatus: 'idle',
      mergeResult: null,
      mergeError: null,
      archiveBytes: null,
      mergeProgress: { step: '', percent: 0, steps: [] },
    });
  },

  clearStorage: async () => {
    await clearAllBackups();
    set({ sourceOfTruth: null, recentFiles: [], storageUsed: 0 });
  },

  reset: async () => {
    // Clean up pending backups on cancel
    const pending = get().pendingBackupIds;
    if (pending.length > 0) {
      for (const id of pending) {
        try { await deleteStoredBackup(id); } catch { /* may not exist */ }
      }
      await get().refreshStorage();
    }
    set({
      screen: 'import',
      mergeMode: 'library',
      backups: [],
      pendingBackupIds: [],
      mergeStatus: 'idle',
      mergeProgress: { step: '', percent: 0, steps: [] },
      mergeResult: null,
      mergeError: null,
      archiveBytes: null,
      explorerData: null,
      explorerLabel: '',
    });
  },
}));
