import { describe, it, expect } from 'vitest';
import { mergeInputFields, IdMap } from '../src/index.js';
import type { InputField, MergeInputFieldsOptions } from '../src/index.js';

function makeField(overrides: Partial<InputField> & { LocationId: number; TextTag: string }): InputField {
  return {
    Value: '',
    ...overrides,
  };
}

function setupMaps(): { idMapA: IdMap; idMapB: IdMap } {
  const idMapA = new IdMap();
  const idMapB = new IdMap();
  idMapA.set('Location', 1, 1);
  idMapA.set('Location', 2, 2);
  idMapB.set('Location', 10, 3);
  idMapB.set('Location', 20, 4);
  // Shared location
  idMapB.set('Location', 1, 1);
  idMapB.set('Location', 2, 2);
  return { idMapA, idMapB };
}

const defaultOptions: MergeInputFieldsOptions = {
  deviceNameA: 'Pixel 6a',
  deviceNameB: 'iPad Air',
};

describe('mergeInputFields', () => {
  it('should keep unique fields from both sources', () => {
    const { idMapA, idMapB } = setupMaps();
    const fieldsA = [makeField({ LocationId: 1, TextTag: 'q1', Value: 'Answer A' })];
    const fieldsB = [makeField({ LocationId: 10, TextTag: 'q1', Value: 'Answer B' })];

    const merged = mergeInputFields(fieldsA, fieldsB, idMapA, idMapB, defaultOptions);

    expect(merged).toHaveLength(2);
  });

  it('should remap LocationId', () => {
    const { idMapA, idMapB } = setupMaps();
    const fieldsA = [makeField({ LocationId: 1, TextTag: 'q1', Value: 'A' })];
    const fieldsB = [makeField({ LocationId: 10, TextTag: 'q2', Value: 'B' })];

    const merged = mergeInputFields(fieldsA, fieldsB, idMapA, idMapB, defaultOptions);

    expect(merged[0]!.LocationId).toBe(1);
    expect(merged[1]!.LocationId).toBe(3);
  });

  it('should deduplicate identical fields (same location, tag, and value)', () => {
    const { idMapA, idMapB } = setupMaps();
    const fieldsA = [makeField({ LocationId: 1, TextTag: 'q1', Value: 'Same answer' })];
    const fieldsB = [makeField({ LocationId: 1, TextTag: 'q1', Value: 'Same answer' })];

    const merged = mergeInputFields(fieldsA, fieldsB, idMapA, idMapB, defaultOptions);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.Value).toBe('Same answer');
  });

  it('should concatenate conflicting values with device names', () => {
    const { idMapA, idMapB } = setupMaps();
    const fieldsA = [makeField({ LocationId: 1, TextTag: 'q1', Value: 'Réponse A' })];
    const fieldsB = [makeField({ LocationId: 1, TextTag: 'q1', Value: 'Réponse B' })];

    const merged = mergeInputFields(fieldsA, fieldsB, idMapA, idMapB, defaultOptions);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.Value).toBe('[Pixel 6a] Réponse A | [iPad Air] Réponse B');
  });

  it('should keep both when same TextTag but different remapped LocationId', () => {
    const { idMapA, idMapB } = setupMaps();
    const fieldsA = [makeField({ LocationId: 1, TextTag: 'q1', Value: 'A' })];
    const fieldsB = [makeField({ LocationId: 10, TextTag: 'q1', Value: 'B' })];

    const merged = mergeInputFields(fieldsA, fieldsB, idMapA, idMapB, defaultOptions);

    // Different remapped LocationIds (1 vs 3) → no collision
    expect(merged).toHaveLength(2);
    expect(merged[0]!.Value).toBe('A');
    expect(merged[1]!.Value).toBe('B');
  });

  it('should handle multiple fields per location', () => {
    const { idMapA, idMapB } = setupMaps();
    const fieldsA = [
      makeField({ LocationId: 1, TextTag: 'q1', Value: 'A1' }),
      makeField({ LocationId: 1, TextTag: 'q2', Value: 'A2' }),
    ];
    const fieldsB = [
      makeField({ LocationId: 1, TextTag: 'q1', Value: 'B1' }),
      makeField({ LocationId: 1, TextTag: 'q3', Value: 'B3' }),
    ];

    const merged = mergeInputFields(fieldsA, fieldsB, idMapA, idMapB, defaultOptions);

    expect(merged).toHaveLength(3);
    // q1 conflicted → concatenated
    const q1 = merged.find((f) => f.TextTag === 'q1')!;
    expect(q1.Value).toBe('[Pixel 6a] A1 | [iPad Air] B1');
    // q2 unique from A
    expect(merged.find((f) => f.TextTag === 'q2')!.Value).toBe('A2');
    // q3 unique from B
    expect(merged.find((f) => f.TextTag === 'q3')!.Value).toBe('B3');
  });

  it('should handle empty sources', () => {
    const { idMapA, idMapB } = setupMaps();
    expect(mergeInputFields([], [], idMapA, idMapB, defaultOptions)).toHaveLength(0);
    expect(
      mergeInputFields(
        [makeField({ LocationId: 1, TextTag: 'q1', Value: 'A' })],
        [],
        idMapA,
        idMapB,
        defaultOptions,
      ),
    ).toHaveLength(1);
    expect(
      mergeInputFields(
        [],
        [makeField({ LocationId: 10, TextTag: 'q1', Value: 'B' })],
        idMapA,
        idMapB,
        defaultOptions,
      ),
    ).toHaveLength(1);
  });

  it('should preserve TextTag exactly', () => {
    const { idMapA, idMapB } = setupMaps();
    const fieldsA = [makeField({ LocationId: 1, TextTag: 'workbook-2024-q3-lesson5', Value: 'My answer' })];

    const merged = mergeInputFields(fieldsA, [], idMapA, idMapB, defaultOptions);

    expect(merged[0]!.TextTag).toBe('workbook-2024-q3-lesson5');
  });

  it('should use custom device names in concatenation', () => {
    const { idMapA, idMapB } = setupMaps();
    const fieldsA = [makeField({ LocationId: 1, TextTag: 'q1', Value: 'Val A' })];
    const fieldsB = [makeField({ LocationId: 1, TextTag: 'q1', Value: 'Val B' })];

    const options: MergeInputFieldsOptions = {
      deviceNameA: 'Windows PC',
      deviceNameB: 'Google Pixel 6a',
    };

    const merged = mergeInputFields(fieldsA, fieldsB, idMapA, idMapB, options);

    expect(merged[0]!.Value).toBe('[Windows PC] Val A | [Google Pixel 6a] Val B');
  });

  it('should handle empty string values', () => {
    const { idMapA, idMapB } = setupMaps();
    const fieldsA = [makeField({ LocationId: 1, TextTag: 'q1', Value: '' })];
    const fieldsB = [makeField({ LocationId: 1, TextTag: 'q1', Value: 'Filled in' })];

    const merged = mergeInputFields(fieldsA, fieldsB, idMapA, idMapB, defaultOptions);

    expect(merged).toHaveLength(1);
    // Empty vs filled → conflict, concatenate
    expect(merged[0]!.Value).toBe('[Pixel 6a]  | [iPad Air] Filled in');
  });
});
