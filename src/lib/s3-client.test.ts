import { describe, expect, it, vi } from 'vitest';
const { constructor } = vi.hoisted(() => ({ constructor: vi.fn() }));
vi.mock('@aws-sdk/client-s3', () => ({ S3Client: class { constructor(config: unknown) { constructor(config); } } }));
vi.mock('astro:env/server', () => ({
  AWS_ENDPOINT_URL_S3: 'https://storage.example.test', AWS_REGION: 'us-east-2',
  AWS_ACCESS_KEY_ID: 'test-key', AWS_SECRET_ACCESS_KEY: 'test-secret', STORAGE_BUCKET: 'assets',
}));

describe('server-only lazy S3 client', () => {
  it('has no import-time requests, construction or signed-URL logs', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const module = await import('../s3-client');
    expect(constructor).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    const first = module.getStorage();
    expect(module.getStorage()).toBe(first);
    expect(constructor).toHaveBeenCalledOnce();
    expect(constructor).toHaveBeenCalledWith(expect.objectContaining({ forcePathStyle: true, requestChecksumCalculation: 'WHEN_REQUIRED' }));
    log.mockRestore();
  });
});
