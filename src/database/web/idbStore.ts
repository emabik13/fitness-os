/** Tiny promise wrapper over IndexedDB storing the SQLite image as one blob. */
const DB_NAME = 'fitness-os';
const STORE = 'sqlite';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir IndexedDB.'));
  });
}

export async function loadImage(key: string): Promise<Uint8Array | null> {
  const idb = await open();
  return new Promise((resolve, reject) => {
    const req = idb.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ? new Uint8Array(req.result as ArrayBuffer) : null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveImage(key: string, image: Uint8Array): Promise<void> {
  const idb = await open();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, 'readwrite');
    // Store a standalone ArrayBuffer copy (the sql.js buffer may be reused).
    tx.objectStore(STORE).put(image.slice().buffer, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo guardar en IndexedDB.'));
    tx.onabort = () => reject(tx.error ?? new Error('Escritura cancelada.'));
  });
}

/** Asks the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
