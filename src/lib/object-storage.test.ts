import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
const { send, sign, optimize } = vi.hoisted(() => ({ send: vi.fn(), sign: vi.fn(), optimize: vi.fn() }));
vi.mock('../s3-client', () => ({ getStorage: () => ({ client: { send }, bucket: 'assets' }) }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: sign }));
vi.mock('./image-optimize', () => ({ optimizeImage: optimize }));
import { authorizeImageUpload, finalizeImageUpload, removeImageObject, signImageDownload } from './object-storage';
import { createPendingKey } from './uploads';
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
async function* body(bytes = png) { yield bytes; }

beforeEach(() => {
  vi.clearAllMocks();
  sign.mockResolvedValue('https://storage.example.test/signed');
  optimize.mockResolvedValue({ bytes: png, mime: 'image/png' });
});

describe('object storage operations', () => {
  it('signs a user-scoped pending PUT, not a public or final object', async () => {
    const result = await authorizeImageUpload(4, 12, 'image/png', 50);
    expect(result.key).toMatch(/^pending\/4\//);
    const command = sign.mock.calls[0][1];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({ Bucket: 'assets', Key: result.key, ContentLength: 12, ContentType: 'image/png' });
    expect(send).not.toHaveBeenCalled();
  });
  it('rejects invalid sizes and MIME before signing', async () => {
    await expect(authorizeImageUpload(4, 51, 'image/png', 50)).rejects.toThrow();
    await expect(authorizeImageUpload(4, 12, 'text/html', 50)).rejects.toThrow();
    expect(sign).not.toHaveBeenCalled();
  });
  it('validates actual bytes and publishes to a new immutable key', async () => {
    send.mockResolvedValueOnce({ Body: body() }).mockResolvedValueOnce({});
    const key = createPendingKey(4);
    const result = await finalizeImageUpload(key, 4, 50);
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[0][0].input.Range).toBe('bytes=0-50');
    expect(result.imageKey).toMatch(/^notes\/[a-f0-9]{32}\.png$/);
    expect(result.imageUrl).toBe(`/media/${result.imageKey}`);
    expect(send.mock.calls[1][0].input.Key).not.toBe(key);
    expect(send.mock.calls[1][0].input.CacheControl).toBe('private, no-store');
  });
  it('rejects another user before any remote read', async () => {
    await expect(finalizeImageUpload(createPendingKey(9), 4, 50)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
  it('rejects forged metadata and MIME and never publishes invalid bytes', async () => {
    send.mockResolvedValueOnce({ Body: body(new Uint8Array(51)), ContentLength: 1 });
    await expect(finalizeImageUpload(createPendingKey(4), 4, 50)).rejects.toThrow();
    send.mockResolvedValueOnce({ Body: body(new Uint8Array(12)) });
    await expect(finalizeImageUpload(createPendingKey(4), 4, 50)).rejects.toThrow('Formato');
    expect(optimize).not.toHaveBeenCalled();
    expect(send.mock.calls.every(([command]) => command instanceof GetObjectCommand)).toBe(true);
  });
  it('only signs final keys with no-store response headers', async () => {
    await expect(signImageDownload('pending/4/file')).rejects.toThrow();
    await signImageDownload(`notes/${'a'.repeat(32)}.jpg`);
    expect(sign.mock.calls[0][1].input.ResponseCacheControl).toBe('private, no-store');
    expect(sign.mock.calls[0][2]).toEqual({ expiresIn: 60 });
  });
  it('cannot delete arbitrary or foreign pending keys', async () => {
    await expect(removeImageObject('arbitrary/file')).rejects.toThrow();
    await expect(removeImageObject(createPendingKey(9), 4)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
