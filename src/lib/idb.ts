const DB_NAME = 'omega-jdr-library-db';
const STORE_NAME = 'handles';
const DB_VERSION = 1;

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveLibraryHandle(id: string, handle: any): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLibraryHandle(id: string): Promise<any | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeLibraryHandle(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveTerrainSaveHandle(handle: any): Promise<void> { const db = await getDb(); return new Promise((resolve, reject) => { const transaction = db.transaction(STORE_NAME, 'readwrite'); const store = transaction.objectStore(STORE_NAME); const request = store.put(handle, 'terrain-save-handle'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }

export async function getTerrainSaveHandle(): Promise<any | undefined> { const db = await getDb(); return new Promise((resolve, reject) => { const transaction = db.transaction(STORE_NAME, 'readonly'); const store = transaction.objectStore(STORE_NAME); const request = store.get('terrain-save-handle'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }

export async function saveWorkfolderHandle(handle: any): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, 'workfolder-handle');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getWorkfolderHandle(): Promise<any | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('workfolder-handle');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export type RecentTerrainMeta = {
  id: string;
  name: string;
  timestamp: number;
};

export async function getRecentTerrainsMetadata(): Promise<RecentTerrainMeta[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('recent-terrains-metadata');

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecentTerrain(terrain: any): Promise<RecentTerrainMeta[]> {
  const db = await getDb();
  return new Promise(async (resolve, reject) => {
    try {
      const metadataList = await getRecentTerrainsMetadata();
      
      const existingIndex = metadataList.findIndex(m => m.id === terrain.id);
      if (existingIndex !== -1) {
        metadataList.splice(existingIndex, 1);
      }
      
      const newMeta: RecentTerrainMeta = {
        id: terrain.id,
        name: terrain.name,
        timestamp: Date.now()
      };
      
      metadataList.unshift(newMeta);
      
      const removedMetas = metadataList.splice(10);
      
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.put(metadataList, 'recent-terrains-metadata');
      store.put(terrain, 'recent-terrain-data-' + terrain.id);
      
      removedMetas.forEach(meta => {
        store.delete('recent-terrain-data-' + meta.id);
      });
      
      transaction.oncomplete = () => resolve(metadataList);
      transaction.onerror = () => reject(transaction.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function getRecentTerrainData(id: string): Promise<any | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('recent-terrain-data-' + id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

