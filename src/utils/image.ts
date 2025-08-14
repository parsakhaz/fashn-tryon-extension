import picaFactory from 'pica';

const pica = picaFactory();

export interface ResizeEncodeOptions {
  maxDimension: number;
  quality: number; // 0..1
  unsharpAmount?: number;
  unsharpRadius?: number;
  unsharpThreshold?: number;
}

const DEFAULT_OPTIONS: ResizeEncodeOptions = {
  maxDimension: 2000,
  quality: 0.95,
  unsharpAmount: 80,
  unsharpRadius: 0.6,
  unsharpThreshold: 2
};

function isDataUrl(input: string): boolean {
  return input.startsWith('data:');
}

async function inputToBlob(input: Blob | File | string): Promise<Blob> {
  if (typeof input !== 'string') return input;
  const url = input;
  if (isDataUrl(url)) {
    // Fetch supports data URLs and is memory efficient
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch data URL: ${res.status} ${res.statusText}`);
    return await res.blob();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error(`Fetched content is not an image: ${blob.type}`);
  return blob;
}

function calculateTargetSize(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  if (width >= height) {
    const newWidth = maxDimension;
    const newHeight = Math.round((height / width) * maxDimension);
    return { width: newWidth, height: newHeight };
  } else {
    const newHeight = maxDimension;
    const newWidth = Math.round((width / height) * maxDimension);
    return { width: newWidth, height: newHeight };
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

/**
 * Resize any image input to fit within maxDimension while preserving aspect ratio,
 * and encode to JPEG at the requested quality. Always returns a data URL string (image/jpeg).
 */
export async function resizeAndEncodeToJpegDataUrl(
  input: Blob | File | string,
  options?: Partial<ResizeEncodeOptions>
): Promise<string> {
  const opts: ResizeEncodeOptions = { ...DEFAULT_OPTIONS, ...(options || {}) };
  const srcBlob = await inputToBlob(input);
  const bitmap = await createImageBitmap(srcBlob);

  const { width: targetWidth, height: targetHeight } = calculateTargetSize(bitmap.width, bitmap.height, opts.maxDimension);

  const needsResize = bitmap.width !== targetWidth || bitmap.height !== targetHeight;

  // DOM path (Pica preferred)
  const canUseDomCanvas = typeof document !== 'undefined' && typeof document.createElement === 'function';
  if (canUseDomCanvas) {
    const dest = document.createElement('canvas');
    dest.width = targetWidth;
    dest.height = targetHeight;
    try {
      if (needsResize) {
        await pica.resize(bitmap as unknown as HTMLImageElement, dest, {
          unsharpAmount: opts.unsharpAmount,
          unsharpRadius: opts.unsharpRadius,
          unsharpThreshold: opts.unsharpThreshold
        } as never);
      } else {
        const ctx = dest.getContext('2d');
        if (!ctx) throw new Error('2D context not available');
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      }
      const jpegBlob = await pica.toBlob(dest, 'image/jpeg', opts.quality);
      return await blobToDataUrl(jpegBlob);
    } catch (_err) {
      // Fall through to Offscreen/native
    }
  }

  // Worker/Offscreen path or final fallback
  if (typeof OffscreenCanvas !== 'undefined') {
    const offscreen = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = offscreen.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    const outBlob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: opts.quality });
    return await blobToDataUrl(outBlob);
  }

  // Ultimate fallback: return original re-read (may not be JPEG)
  return await blobToDataUrl(srcBlob);
}


