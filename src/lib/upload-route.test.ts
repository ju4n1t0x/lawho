import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getActiveSession: vi.fn(), authorizeImageUpload: vi.fn() }));
vi.mock('astro:env/server', () => ({ MAX_UPLOAD_SIZE_BYTES: 5242880 }));
vi.mock('./session-repo', () => mocks);
vi.mock('./object-storage', () => mocks);
import { POST } from '../pages/escritor/uploads';
import { UploadValidationError } from './uploads';
const origin = 'https://lawho.example';
function context(body = JSON.stringify({ size: 10, contentType: 'image/png' }), headers = {}, token: string | undefined = 'session') {
  return {
    request: new Request(`${origin}/escritor/uploads`, { method: 'POST', body,
      headers: { Origin: origin, 'Content-Type': 'application/json', ...headers } }),
    cookies: { get: () => token ? { value: token } : undefined },
  } as any;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getActiveSession.mockResolvedValue({ userId: 4 });
  mocks.authorizeImageUpload.mockResolvedValue({ key: 'pending/4/example', method: 'PUT', url: 'https://storage.example/signed' });
});
describe('upload authorization endpoint', () => {
  it('requires both a same-origin request and valid independent session', async () => {
    expect((await POST(context(undefined, { Origin: 'https://attacker.example' }))).status).toBe(403);
    mocks.getActiveSession.mockResolvedValue(null);
    expect((await POST(context())).status).toBe(401);
    expect(mocks.authorizeImageUpload).not.toHaveBeenCalled();
  });
  it('bounds actual bytes, rejects invalid JSON and missing metadata', async () => {
    expect((await POST(context('x'.repeat(2049)))).status).toBe(413);
    expect((await POST(context('{invalid'))).status).toBe(400);
    expect((await POST(context('null'))).status).toBe(400);
  });
  it('signs only validated metadata for the session user without caching', async () => {
    const result = await POST(context());
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(mocks.authorizeImageUpload).toHaveBeenCalledWith(4, 10, 'image/png', 5242880);
  });
  it('returns safe validation errors but hides SDK secrets and URLs', async () => {
    mocks.authorizeImageUpload.mockRejectedValueOnce(new UploadValidationError('Formato de imagen no permitido'));
    expect(await (await POST(context())).json()).toEqual({ error: 'Formato de imagen no permitido' });
    mocks.authorizeImageUpload.mockRejectedValue(new Error('SECRET https://storage.example/signed'));
    const result = await POST(context());
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain('SECRET');
  });
});
