/**
 * Merge configuration: per-data-type strategies and presets.
 */

/** How to resolve conflicts for notes with matching GUIDs but different content. */
export type NoteConflictStrategy = 'concatenate' | 'keepNewest' | 'keepA' | 'keepB';

/** How to resolve conflicts for highlights with matching GUIDs but different styles. */
export type HighlightConflictStrategy = 'keepNewest' | 'keepA' | 'keepB';

/** How to resolve conflicts for input fields with matching keys but different values. */
export type InputFieldConflictStrategy = 'smartMerge' | 'keepA' | 'keepB';

/** Full merge configuration — one strategy per data type that has conflicts. */
export interface MergeConfig {
  notes: NoteConflictStrategy;
  highlights: HighlightConflictStrategy;
  inputFields: InputFieldConflictStrategy;
}

/** Named presets for common merge scenarios. */
export type MergePreset = 'keepAll' | 'preferA' | 'preferB';

/** Default config: smart merge for everything. */
export const DEFAULT_MERGE_CONFIG: MergeConfig = {
  notes: 'concatenate',
  highlights: 'keepNewest',
  inputFields: 'smartMerge',
};

/** Resolve a preset name to a full MergeConfig. */
export function presetToConfig(preset: MergePreset): MergeConfig {
  switch (preset) {
    case 'keepAll':
      return {
        notes: 'concatenate',
        highlights: 'keepNewest',
        inputFields: 'smartMerge',
      };
    case 'preferA':
      return {
        notes: 'keepA',
        highlights: 'keepA',
        inputFields: 'keepA',
      };
    case 'preferB':
      return {
        notes: 'keepB',
        highlights: 'keepB',
        inputFields: 'keepB',
      };
  }
}

export const MERGE_PRESETS: MergePreset[] = ['keepAll', 'preferA', 'preferB'];
