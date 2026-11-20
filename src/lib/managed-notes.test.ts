import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createNote: vi.fn(), updateNote: vi.fn(), replaceNoteImage: vi.fn(), getNoteBySlug: vi.fn(),
  isImageReferenced: vi.fn(), finalizeImageUpload: vi.fn(), removeImageObject: vi.fn() }));
vi.mock('astro:env/server', () => ({ MAX_UPLOAD_SIZE_BYTES: 5242880 }));
vi.mock('./notes-repo', () => mocks);
vi.mock('./object-storage', () => mocks);
import { createManagedNote, updateManagedNote } from './managed-notes';
const input = { title: 'Title', subtitle: 'Subtitle', body: 'Body' };
const image = { imageKey: `notes/${'a'.repeat(32)}.jpg`, imageUrl: `/media/notes/${'a'.repeat(32)}.jpg` };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.finalizeImageUpload.mockResolvedValue(image);
  mocks.isImageReferenced.mockResolvedValue(false);
  mocks.getNoteBySlug.mockResolvedValue({ imageKey: `notes/${'b'.repeat(32)}.jpg`, data: { image: '/media/old' } });
  mocks.createNote.mockResolvedValue({ slug: 'created' });
  mocks.updateNote.mockResolvedValue({ slug: 'updated' });
  mocks.replaceNoteImage.mockResolvedValue({ note: { slug: 'updated' }, previousImageKey: `notes/${'b'.repeat(32)}.jpg` });
});

describe('managed note image persistence', () => {
  it('finalizes then saves stable references then cleans pending upload', async () => {
    await createManagedNote(input, 'pending-key', 4);
    expect(mocks.createNote).toHaveBeenCalledWith({ ...input, ...image });
    expect(mocks.removeImageObject).toHaveBeenCalledWith('pending-key', 4);
    expect(mocks.createNote.mock.invocationCallOrder[0]).toBeLessThan(mocks.removeImageObject.mock.invocationCallOrder[0]);
  });
  it('retains both image references when editing without an upload', async () => {
    await updateManagedNote('post', input, undefined, 4);
    expect(mocks.updateNote).toHaveBeenCalledWith('post', input);
    expect(mocks.finalizeImageUpload).not.toHaveBeenCalled();
    expect(mocks.removeImageObject).not.toHaveBeenCalled();
  });
  it('does not delete the old image when the database update fails', async () => {
    mocks.replaceNoteImage.mockRejectedValue(new Error('database unavailable'));
    await expect(updateManagedNote('post', input, 'pending-key', 4)).rejects.toThrow();
    expect(mocks.removeImageObject).toHaveBeenCalledExactlyOnceWith(image.imageKey);
  });
  it('checks references and only deletes old image after successful replacement', async () => {
    await updateManagedNote('post', input, 'pending-key', 4);
    expect(mocks.replaceNoteImage).toHaveBeenCalledWith('post', { ...input, ...image });
    expect(mocks.removeImageObject.mock.calls[0][0]).toBe(`notes/${'b'.repeat(32)}.jpg`);
    expect(mocks.replaceNoteImage.mock.invocationCallOrder[0]).toBeLessThan(mocks.removeImageObject.mock.invocationCallOrder[0]);
  });
  it('retains referenced objects and tolerates cleanup failures after success', async () => {
    mocks.isImageReferenced.mockResolvedValue(true);
    mocks.removeImageObject.mockRejectedValue(new Error('storage secret must not be logged'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(updateManagedNote('post', input, 'pending-key', 4)).resolves.toEqual({ slug: 'updated' });
    expect(mocks.removeImageObject).toHaveBeenCalledExactlyOnceWith('pending-key', 4);
    expect(warn.mock.calls.flat().join(' ')).not.toContain('storage secret');
    warn.mockRestore();
  });
});
