import { create } from 'zustand';
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

interface AppStore {
  screen: Screen;
  backups: ImportedBackup[];
  mergeStatus: MergeStatus;
  mergeProgress: MergeProgress;
  mergeResult: MergeResult | null;
  mergeError: string | null;
  archiveBytes: Uint8Array | null;

  addBackup: (backup: ImportedBackup) => void;
  removeBackup: (id: string) => void;
  goTo: (screen: Screen) => void;
  canMerge: () => boolean;
  setMergeStatus: (status: MergeStatus) => void;
  setMergeProgress: (progress: MergeProgress) => void;
  setMergeResult: (result: MergeResult) => void;
  setMergeError: (error: string | null) => void;
  setArchiveBytes: (bytes: Uint8Array) => void;
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

  addBackup: (backup) => set((s) => ({ backups: [...s.backups, backup] })),
  removeBackup: (id) => set((s) => ({ backups: s.backups.filter((b) => b.id !== id) })),
  goTo: (screen) => set({ screen }),
  canMerge: () => get().backups.length >= 2,
  setMergeStatus: (status) => set({ mergeStatus: status }),
  setMergeProgress: (progress) => set({ mergeProgress: progress }),
  setMergeResult: (result) => set({ mergeResult: result }),
  setMergeError: (error) => set({ mergeError: error }),
  setArchiveBytes: (bytes) => set({ archiveBytes: bytes }),
  reset: () =>
    set({
      screen: 'import',
      backups: [],
      mergeStatus: 'idle',
      mergeProgress: { step: '', percent: 0, steps: [] },
      mergeResult: null,
      mergeError: null,
      archiveBytes: null,
    }),
}));
