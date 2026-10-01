// ponytail: files stay in this browser; move to authenticated private Blob storage for cross-device access.
const DATABASE = "franchise-prototype-files";
const STORE = "application-files";

export type DemoFile = { name: string; type: string; size: number; blob: Blob };
export type PendingDemoFile = { fieldId: string; file: File };

let database: Promise<IDBDatabase> | undefined;

function openDatabase() {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.reject(new Error("Penyimpanan berkas lokal tidak tersedia."));
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Database berkas tidak dapat dibuka."));
      request.onblocked = () => reject(new Error("Penyimpanan berkas sedang digunakan oleh tab lain."));
    });
  }
  return database;
}

export async function saveDemoFiles(applicationId: string, files: PendingDemoFile[]) {
  if (!files.length) return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    files.forEach(({ fieldId, file }) => store.put({
      id: `${applicationId}:${fieldId}`,
      applicationId,
      fieldId,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      blob: file,
    }));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Berkas tidak dapat disimpan."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Penyimpanan berkas dibatalkan."));
  });
}

export async function readDemoFile(applicationId: string, fieldId: string): Promise<DemoFile | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(`${applicationId}:${fieldId}`);
    request.onsuccess = () => {
      const result = request.result as DemoFile | undefined;
      resolve(result ? { name: result.name, type: result.type, size: result.size, blob: result.blob } : null);
    };
    request.onerror = () => reject(request.error ?? new Error("Berkas tidak dapat dibaca."));
  });
}
