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

// Videos are re-encoded in the browser to an MP4 (H.264/AAC) at most 1280 px on the long side before upload:
// about 3-5x smaller than a phone recording, and it plays in every browser (iPhone HEVC .mov does not).
// Any failure (a browser without the encoders, an odd file) uploads the original instead.
export const compressVideo = async (file: File, onProgress: (pct: number) => void): Promise<File> => {
  try {
    const mb = await import('mediabunny'); // loaded only when a video is added
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({
      input,
      output,
      video: (track) => {
        const long = Math.max(track.displayWidth, track.displayHeight);
        const scale = Math.min(1, 1280 / long);
        const even = (n: number) => Math.round((n * scale) / 2) * 2; // H.264 needs even sizes
        return { codec: 'avc', width: even(track.displayWidth), height: even(track.displayHeight), fit: 'contain' as const, quality: mb.QUALITY_MEDIUM, forceTranscode: true };
      },
      audio: { codec: 'aac', quality: mb.QUALITY_MEDIUM },
      showWarnings: false,
    });
    if (!conversion.isValid || conversion.discardedTracks.length) return file; // e.g. no AAC encoder: never drop the sound
    conversion.onProgress = (p) => onProgress(Math.round(p * 100));
    await conversion.execute();
    const buf = output.target.buffer;
    if (!buf || buf.byteLength >= file.size) return file; // already small: keep the original
    return new File([buf], file.name.replace(/\.\w+$/, '') + '.mp4', { type: 'video/mp4' });
  } catch (e) {
    console.warn('Video not compressed, uploading the original:', e);
    return file;
  }
};

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_PHOTOS = 8;
export const MAX_VIDEOS = 3;
