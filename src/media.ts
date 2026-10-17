import { useEffect, useState } from 'react';

// Listing media now uploads to the server. Videos added before that were kept in this browser's IndexedDB
// as "idb:<id>" references; this reads them so those listings still play here.
const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('gb_media', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const loadMedia = async (id: string): Promise<Blob | undefined> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction('files').objectStore('files').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// Playable URL for a stored video; null while loading, '' if it is missing from this browser.
export const useMediaUrl = (ref: string): string | null => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl = '';
    let live = true;
    loadMedia(ref)
      .then((blob) => {
        if (!live) return;
        objectUrl = blob ? URL.createObjectURL(blob) : '';
        setUrl(objectUrl);
      })
      .catch(() => live && setUrl(''));
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ref]);
  return url;
};

// Photos are shrunk to a JPEG data URL so they fit in the listing record like the seeded photos.
export const photoDataUrl = async (file: File, maxSide = 1600): Promise<string> => {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.toDataURL('image/jpeg', 0.82);
};

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_PHOTOS = 8;
export const MAX_VIDEOS = 3;
