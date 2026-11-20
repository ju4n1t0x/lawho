import { randomBytes } from 'node:crypto';

export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const UPLOAD_URL_TTL_SECONDS = 300;
export const PENDING_TTL_MS = 15 * 60 * 1000;

export class UploadValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'UploadValidationError'; }
}

export function assertWithinSizeLimit(sizeBytes: number, maxBytes = DEFAULT_MAX_UPLOAD_SIZE_BYTES) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('Límite de imágenes no válido');
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1) throw new UploadValidationError('La imagen está vacía o su tamaño no es válido');
  if (sizeBytes > maxBytes) throw new UploadValidationError(`La imagen no debe superar ${Math.floor(maxBytes / (1024 * 1024))}MB`);
}

export function createPendingKey(userId: number, now = Date.now()) {
  if (!Number.isSafeInteger(userId) || userId < 1) throw new UploadValidationError('Sesión no válida');
  return `pending/${userId}/${now}-${randomBytes(16).toString('hex')}`;
}

export function assertPendingOwnership(key: string, userId: number, now = Date.now()) {
  const match = /^pending\/([1-9]\d*)\/(\d{13})-([a-f0-9]{32})$/.exec(key);
  if (!match || Number(match[1]) !== userId) throw new UploadValidationError('La referencia de imagen no es válida');
  const age = now - Number(match[2]);
  if (age < -60_000 || age > PENDING_TTL_MS) throw new UploadValidationError('La carga de imagen venció. Seleccioná la imagen nuevamente');
}

export function isManagedImageKey(key: string): boolean {
  return /^notes\/[a-f0-9]{32}\.(jpg|png)$/.test(key);
}

export function imageDeliveryUrl(key: string): string {
  if (!isManagedImageKey(key)) throw new UploadValidationError('La referencia de imagen no es válida');
  return `/media/${key}`;
}

/** Bounded stream reads prevent a forged metadata value from allocating arbitrary memory. */
export async function readBoundedImage(body: AsyncIterable<Uint8Array>, maxBytes: number): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for await (const chunk of body) {
      size += chunk.byteLength;
      assertWithinSizeLimit(size, maxBytes);
      chunks.push(chunk);
    }
    assertWithinSizeLimit(size, maxBytes);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } finally {
    const stream = body as AsyncIterable<Uint8Array> & { destroy?: () => void };
    stream.destroy?.();
  }
}
