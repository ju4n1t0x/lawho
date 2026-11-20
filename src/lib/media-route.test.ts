import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ findManagedImage: vi.fn(), signImageDownload: vi.fn(), getActiveSession: vi.fn() }));
vi.mock('./notes-repo', () => mocks);
vi.mock('./object-storage', () => mocks);
vi.mock('./session-repo', () => mocks);
import { GET } from '../pages/media/[...key]';
const key = `notes/${'a'.repeat(32)}.jpg`;
function context(value = key, token?: string) {
  return { params: { key: value }, cookies: { get: () => token ? { value: token } : undefined } } as any;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.findManagedImage.mockResolvedValue({ draft: false });
  mocks.signImageDownload.mockResolvedValue('https://storage.example.test/new-signature');
});
describe('managed image delivery', () => {
  it('redirects anonymous published reads to freshly signed no-store access', async () => {
    const result = await GET(context());
    expect(result.status).toBe(302);
    expect(result.headers.get('cache-control')).toBe('private, no-store');
    expect(result.headers.get('location')).toContain('new-signature');
  });
  it('does not sign pending, traversal, arbitrary or deleted images', async () => {
    for (const value of ['pending/1/test', '../x.jpg', 'https://example.test/key']) {
      expect((await GET(context(value))).status).toBe(404);
    }
    mocks.findManagedImage.mockResolvedValue(null);
    expect((await GET(context())).status).toBe(404);
    expect(mocks.signImageDownload).not.toHaveBeenCalled();
  });
  it('requires a valid session for drafts', async () => {
    mocks.findManagedImage.mockResolvedValue({ draft: true });
    expect((await GET(context())).status).toBe(404);
    mocks.getActiveSession.mockResolvedValue(null);
    expect((await GET(context(key, 'invalid'))).status).toBe(404);
    expect(mocks.signImageDownload).not.toHaveBeenCalled();
    mocks.getActiveSession.mockResolvedValue({ userId: 1 });
    expect((await GET(context(key, 'valid'))).status).toBe(302);
  });
});
