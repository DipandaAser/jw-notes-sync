import type { InputField } from './models.js';
import type { IdMap } from './id-map.js';

/**
 * Build a natural key for InputField deduplication (after FK remapping).
 */
function inputFieldKey(field: InputField): string {
  return `${field.LocationId}|${field.TextTag}`;
}

export interface MergeInputFieldsOptions {
  deviceNameA: string;
  deviceNameB: string;
}

/**
 * Merge InputField tables from two databases.
 *
 * **Merge order: 8** — depends on Location (step 1).
 * `Location` mappings must exist in idMapA/idMapB before calling.
 *
 * Strategy:
 * - Match by remapped LocationId + TextTag
 * - Identical values → deduplicate (keep one)
 * - Different values → concatenate: `[Device A] value A | [Device B] value B`
 * - Unique → carry over with remapped LocationId
 */
export function mergeInputFields(
  fieldsA: InputField[],
  fieldsB: InputField[],
  idMapA: IdMap,
  idMapB: IdMap,
  options: MergeInputFieldsOptions,
): InputField[] {
  const merged: InputField[] = [];

  // Index A fields by natural key (after remapping)
  const aByKey = new Map<string, InputField>();

  for (const field of fieldsA) {
    const remapped: InputField = {
      ...field,
      LocationId: idMapA.get('Location', field.LocationId),
    };
    aByKey.set(inputFieldKey(remapped), remapped);
    merged.push(remapped);
  }

  for (const field of fieldsB) {
    const remapped: InputField = {
      ...field,
      LocationId: idMapB.get('Location', field.LocationId),
    };
    const key = inputFieldKey(remapped);
    const existing = aByKey.get(key);

    if (existing) {
      if (existing.Value !== remapped.Value) {
        if (!existing.Value) {
          // A is empty — keep B's value
          existing.Value = remapped.Value;
        } else if (!remapped.Value) {
          // B is empty — keep A's value (already in merged)
        } else {
          // Both non-empty — concatenate with device labels
          existing.Value =
            `[${options.deviceNameA}] ${existing.Value} | [${options.deviceNameB}] ${remapped.Value}`;
        }
      }
      // Identical values → already in merged, skip
    } else {
      merged.push(remapped);
    }
  }

  return merged;
}
