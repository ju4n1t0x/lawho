import { describe, expect, it } from 'vitest';
import {
  assertPendingOwnership, assertWithinSizeLimit, createPendingKey, DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  imageDeliveryUrl, isManagedImageKey, PENDING_TTL_MS, readBoundedImage,
} from './uploads';

describe('upload boundaries', () => {
  it('accepts exactly 5 MiB and rejects larger, empty and forged sizes', () => {
    expect(() => assertWithinSizeLimit(DEFAULT_MAX_UPLOAD_SIZE_BYTES)).not.toThrow();
    for (const size of [DEFAULT_MAX_UPLOAD_SIZE_BYTES + 1, 0, -1, NaN, '123']) {
      expect(() => assertWithinSizeLimit(size as number)).toThrow();
    }
  });
  it('creates unique user-scoped keys and validates ownership and age', () => {
    const now = 1800000000000;
    const key = createPendingKey(7, now);
    expect(key).not.toBe(createPendingKey(7, now));
    expect(() => assertPendingOwnership(key, 7, now)).not.toThrow();
    expect(() => assertPendingOwnership(key, 8, now)).toThrow();
    expect(() => assertPendingOwnership(key, 7, now + PENDING_TTL_MS + 1)).toThrow('venció');
    expect(() => assertPendingOwnership(key, 7, now - 61000)).toThrow();
    for (const invalid of ['../x', key + '/x', 'https://example.test/x']) {
      expect(() => assertPendingOwnership(invalid, 7, now)).toThrow();
    }
  });
  it('only creates delivery URLs for unique finalized objects', () => {
    const key = `notes/${'a'.repeat(32)}.jpg`;
    expect(imageDeliveryUrl(key)).toBe(`/media/${key}`);
    for (const invalid of ['pending/1/x', 'notes/../x.jpg', key + '?x', 'https://x.test/a']) {
      expect(isManagedImageKey(invalid)).toBe(false);
      expect(() => imageDeliveryUrl(invalid)).toThrow();
    }
  });
  it('bounds real stream bytes, not just reported metadata', async () => {
    async function* stream() { yield new Uint8Array([1, 2]); yield new Uint8Array([3, 4]); }
    expect(await readBoundedImage(stream(), 4)).toEqual(new Uint8Array([1, 2, 3, 4]));
    await expect(readBoundedImage(stream(), 3)).rejects.toThrow('superar');
    async function* empty() {}
    await expect(readBoundedImage(empty(), 3)).rejects.toThrow('vacía');
  });
});
