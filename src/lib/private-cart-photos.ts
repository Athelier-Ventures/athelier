"use client";

/** Customer photographs are kept only in IndexedDB on this device until secure order intake exists.
 * No private image bytes are uploaded, placed in localStorage or cached by the public service worker.
 */
const DB_NAME = "athelier-private-cart-photos-v1";
const STORE = "files";

export type PendingPhoto = { id: string; slotId: string; slotLabel: string; fileName: string; file: File };
export type PhotoReference = Omit<PendingPhoto, "file">;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Este navegador no admite almacenamiento privado de fotografías."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE, { keyPath: "key" }); };
    request.onerror = () => reject(new Error("No se pudo abrir el almacenamiento privado del navegador."));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function storePrivatePhotos(cartItemId: string, photos: PendingPhoto[]): Promise<PhotoReference[]> {
  if (!photos.length) return [];
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error("No se pudieron guardar las fotografías. Revisa el espacio disponible."));
      transaction.onerror = () => reject(new Error("No se pudieron guardar las fotografías."));
      for (const photo of photos) {
        store.put({ key: cartItemId + ":" + photo.id, cartItemId, file: photo.file });
      }
    });
  } finally { db.close(); }
  return photos.map(({ file: _file, ...reference }) => reference);
}

export async function deletePrivatePhotos(cartItemId: string, photos: PhotoReference[] = []) {
  if (!photos.length) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      for (const photo of photos) store.delete(cartItemId + ":" + photo.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("No se pudieron borrar las fotografías."));
    });
  } finally { db.close(); }
}

export function validateCustomerPhotos(files: File[], maxCount: number): string | null {
  if (files.length > maxCount) return "Selecciona como máximo " + maxCount + " fotografía(s) para esta sección.";
  if (files.some(file => !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size === 0 || file.size > 2*1024*1024))
    return "Cada fotografía debe ser JPG, PNG o WebP y pesar como máximo 2 MB.";
  return null;
}

/** Retrieve a photo previously saved with its cart item; never send these bytes to analytics or public routes. */
export async function readPrivatePhoto(cartItemId: string, photo: PhotoReference): Promise<File> {
  const db=await openDb();
  try{
    return await new Promise<File>((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly");
      const request=tx.objectStore(STORE).get(cartItemId+":"+photo.id);
      request.onerror=()=>reject(new Error("No fue posible leer una fotografía privada."));
      request.onsuccess=()=>{
        const result=request.result as {file?:unknown}|undefined;
        if (!(result?.file instanceof Blob)) {
          reject(new Error("Falta una fotografía en este dispositivo: "+photo.fileName+". Vuelve a agregarla al carrito."));
          return;
        }
        resolve(new File([result.file],photo.fileName,{type:result.file.type}));
      };
    });
  }finally{db.close();}
}
