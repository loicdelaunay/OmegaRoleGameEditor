// src/lib/lastConfig.ts
// Persistance du dernier terrain ouvert + position caméra/zoom dans le workfolder.
// Fail-soft : aucune erreur n'est propagée à l'UI.

// Type-safe shape for the writable file handle. The File System Access API
// ships `createWritable()` on FileSystemFileHandle, but the lib.dom types
// predate its standardization, so we extend the type locally.
type WritableFileHandle = FileSystemFileHandle & {
  createWritable(): Promise<FileSystemWritableFileStream>;
};

export const LAST_CONFIG_FILE_NAME = 'last.config.json';

export type LastConfig = {
  version: 1;
  lastTerrainFileName: string;
  camera: {
    editor: { scrollX: number; scrollY: number; zoom: number };
    player: { scrollX: number; scrollY: number; zoom: number };
  };
  updatedAt: number;
};

function isLastConfig(value: unknown): value is LastConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (typeof v.lastTerrainFileName !== 'string') return false;
  if (typeof v.updatedAt !== 'number') return false;
  if (!v.camera || typeof v.camera !== 'object') return false;
  const cam = v.camera as Record<string, unknown>;
  for (const key of ['editor', 'player'] as const) {
    const side = cam[key] as Record<string, unknown> | undefined;
    if (!side) return false;
    if (typeof side.scrollX !== 'number' || typeof side.scrollY !== 'number' || typeof side.zoom !== 'number') return false;
  }
  return true;
}

export async function readLastConfig(handle: FileSystemDirectoryHandle): Promise<LastConfig | null> {
  try {
    const fileHandle = await handle.getFileHandle(LAST_CONFIG_FILE_NAME);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!isLastConfig(parsed)) {
      console.warn(`[lastConfig] ${LAST_CONFIG_FILE_NAME} has invalid shape or wrong version, ignoring.`);
      return null;
    }
    return parsed;
  } catch (e: unknown) {
    // NotFoundError = fichier absent, c'est normal au premier lancement
    if (e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'NotFoundError') return null;
    console.error(`[lastConfig] Failed to read ${LAST_CONFIG_FILE_NAME}:`, e);
    return null;
  }
}

export async function writeLastConfig(
  handle: FileSystemDirectoryHandle,
  config: LastConfig,
): Promise<void> {
  try {
    const fileHandle = (await handle.getFileHandle(LAST_CONFIG_FILE_NAME, { create: true })) as WritableFileHandle;
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(config, null, 2));
    await writable.close();
  } catch (e) {
    console.error(`[lastConfig] Failed to write ${LAST_CONFIG_FILE_NAME}:`, e);
  }
}
