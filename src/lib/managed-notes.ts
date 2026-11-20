import { MAX_UPLOAD_SIZE_BYTES } from 'astro:env/server';
import { createNote, getNoteBySlug, updateNote, replaceNoteImage, isImageReferenced, type NewNoteInput } from './notes-repo';
import { finalizeImageUpload, removeImageObject } from './object-storage';
import { UploadValidationError } from './uploads';

type PostFields = Pick<NewNoteInput, 'title' | 'subtitle' | 'body' | 'tag'>;

async function cleanupFinal(key: string) {
  try {
    if (!await isImageReferenced(key)) await removeImageObject(key);
  } catch { console.warn('No se pudo limpiar un objeto de imagen sin referencia'); }
}

async function cleanupPending(key: string, userId: number) {
  try { await removeImageObject(key, userId); }
  catch { console.warn('No se pudo limpiar una imagen pendiente'); }
}

export async function createManagedNote(input: PostFields, pendingKey: string, userId: number) {
  if (!pendingKey) throw new UploadValidationError('La imagen es obligatoria');
  const image = await finalizeImageUpload(pendingKey, userId, MAX_UPLOAD_SIZE_BYTES);
  let note;
  try { note = await createNote({ ...input, ...image }); }
  catch (error) { await cleanupFinal(image.imageKey); throw error; }
  await cleanupPending(pendingKey, userId);
  return note;
}

export async function updateManagedNote(slug: string, input: PostFields, pendingKey: string | undefined, userId: number) {
  const current = await getNoteBySlug(slug);
  if (!current) return null;
  if (!pendingKey && !current.data.image) throw new UploadValidationError('La imagen es obligatoria');
  const image = pendingKey ? await finalizeImageUpload(pendingKey, userId, MAX_UPLOAD_SIZE_BYTES) : undefined;
  let note;
  let previousImageKey: string | null = null;
  try {
    if (image) {
      const replacement = await replaceNoteImage(slug, { ...input, ...image });
      note = replacement?.note ?? null;
      previousImageKey = replacement?.previousImageKey ?? null;
    } else {
      note = await updateNote(slug, input);
    }
  }
  catch (error) { if (image) await cleanupFinal(image.imageKey); throw error; }
  if (!note) { if (image) await cleanupFinal(image.imageKey); return null; }
  if (image) {
    if (previousImageKey) await cleanupFinal(previousImageKey);
    await cleanupPending(pendingKey!, userId);
  }
  return note;
}
