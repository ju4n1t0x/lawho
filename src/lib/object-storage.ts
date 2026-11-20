import { randomBytes } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getStorage } from '../s3-client';
import { optimizeImage } from './image-optimize';
import { sniffImageMime } from './uploads-mime';
import {
  assertPendingOwnership, assertWithinSizeLimit, createPendingKey, imageDeliveryUrl,
  isManagedImageKey, readBoundedImage, UPLOAD_URL_TTL_SECONDS, UploadValidationError,
} from './uploads';

export async function authorizeImageUpload(userId: number, size: number, contentType: string, maxBytes: number) {
  assertWithinSizeLimit(size, maxBytes);
  if (!['image/jpeg', 'image/png'].includes(contentType)) throw new UploadValidationError('Formato de imagen no permitido');
  const key = createPendingKey(userId);
  const { client, bucket } = getStorage();
  const url = await getSignedUrl(client, new PutObjectCommand({
    Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size,
  }), { expiresIn: UPLOAD_URL_TTL_SECONDS });
  return { key, url, method: 'PUT' as const, headers: { 'Content-Type': contentType } };
}

export async function finalizeImageUpload(key: string, userId: number, maxBytes: number) {
  assertPendingOwnership(key, userId);
  const { client, bucket } = getStorage();
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=0-${maxBytes}` }));
  if (!response.Body) throw new UploadValidationError('No se encontró la imagen cargada');
  const bytes = await readBoundedImage(response.Body as AsyncIterable<Uint8Array>, maxBytes);
  const mime = sniffImageMime(bytes);
  if (!mime) throw new UploadValidationError('Formato de imagen no permitido');
  let optimized;
  try { optimized = await optimizeImage(bytes, mime); }
  catch { throw new UploadValidationError('La imagen no se pudo procesar'); }
  assertWithinSizeLimit(optimized.bytes.byteLength, maxBytes);
  const imageKey = `notes/${randomBytes(16).toString('hex')}.${mime === 'image/jpeg' ? 'jpg' : 'png'}`;
  await client.send(new PutObjectCommand({
    Bucket: bucket, Key: imageKey, Body: optimized.bytes, ContentType: mime,
    CacheControl: 'private, no-store',
  }));
  return { imageKey, imageUrl: imageDeliveryUrl(imageKey) };
}

export async function removeImageObject(key: string, pendingUserId?: number) {
  if (pendingUserId !== undefined) assertPendingOwnership(key, pendingUserId);
  else if (!isManagedImageKey(key)) throw new UploadValidationError('La referencia de imagen no es válida');
  const { client, bucket } = getStorage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function signImageDownload(key: string) {
  if (!isManagedImageKey(key)) throw new UploadValidationError('La referencia de imagen no es válida');
  const { client, bucket } = getStorage();
  return getSignedUrl(client, new GetObjectCommand({
    Bucket: bucket, Key: key, ResponseCacheControl: 'private, no-store',
  }), { expiresIn: 60 });
}
