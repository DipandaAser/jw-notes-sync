import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { parseJWLibrary } from '@jw-notes-sync/core';
import { nativeAdapter } from '../adapter';
import { useAppStore, type ImportedBackup } from '../stores/app';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function pickAndImportBackup(): Promise<void> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled || result.assets.length === 0) return;

  const asset = result.assets[0]!;

  // Filter by extension
  if (!asset.name.endsWith('.jwlibrary')) {
    throw new Error('Please select a .jwlibrary file');
  }

  const file = new File(asset.uri);
  const base64 = await file.base64();
  const bytes = base64ToUint8Array(base64);

  const archive = await parseJWLibrary(nativeAdapter, bytes);

  const backup: ImportedBackup = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: asset.name,
    deviceName: archive.manifest.userDataBackup.deviceName,
    date: archive.manifest.userDataBackup.lastModifiedDate,
    archive,
    stats: {
      notes: archive.database.notes.length,
      highlights: archive.database.userMarks.length,
      bookmarks: archive.database.bookmarks.length,
      tags: archive.database.tags.length,
    },
  };

  useAppStore.getState().addBackup(backup);
}

export async function importFromUri(uri: string): Promise<void> {
  const file = new File(uri);
  const base64 = await file.base64();
  const bytes = base64ToUint8Array(base64);

  const archive = await parseJWLibrary(nativeAdapter, bytes);

  const fileName = file.name ?? 'shared.jwlibrary';

  const backup: ImportedBackup = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName,
    deviceName: archive.manifest.userDataBackup.deviceName,
    date: archive.manifest.userDataBackup.lastModifiedDate,
    archive,
    stats: {
      notes: archive.database.notes.length,
      highlights: archive.database.userMarks.length,
      bookmarks: archive.database.bookmarks.length,
      tags: archive.database.tags.length,
    },
  };

  useAppStore.getState().addBackup(backup);
}
