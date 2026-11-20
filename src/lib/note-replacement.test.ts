import { beforeEach, describe, expect, it, vi } from 'vitest';
const { query, release, connect } = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), connect: vi.fn() }));
vi.mock('./db', () => ({ getPool: () => ({ connect }) }));
import { replaceNoteImage } from './notes-repo';
const fields = { title: 'Title', subtitle: 'Subtitle', body: 'Body', imageUrl: '/media/key', imageKey: 'notes/key.jpg' };
beforeEach(() => {
  vi.resetAllMocks();
  connect.mockResolvedValue({ query, release });
});
describe('transactional image replacement', () => {
  it('locks the row and returns the actual displaced key only after commit', async () => {
    query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ image_key: 'actual-displaced' }] })
      .mockResolvedValueOnce({ rows: [{ slug: 'post', title: 'Title', subtitle: 'Sub', body: 'Body', date: '2026-01-01', image_url: '/media/key', image_key: 'notes/key.jpg' }] })
      .mockResolvedValueOnce({});
    const result = await replaceNoteImage('post', fields);
    expect(query.mock.calls[0][0]).toBe('BEGIN');
    expect(query.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(query.mock.calls[2][0]).toContain('image_key = $7');
    expect(query.mock.calls[3][0]).toBe('COMMIT');
    expect(result?.previousImageKey).toBe('actual-displaced');
    expect(release).toHaveBeenCalledOnce();
  });
  it('rolls back failures and always releases the connection', async () => {
    query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ image_key: 'old' }] })
      .mockRejectedValueOnce(new Error('write failure')).mockResolvedValueOnce({});
    await expect(replaceNoteImage('post', fields)).rejects.toThrow('write failure');
    expect(query.mock.calls[3][0]).toBe('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });
  it('does not update a missing or soft-deleted note', async () => {
    query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({});
    expect(await replaceNoteImage('post', fields)).toBeNull();
    expect(query.mock.calls[2][0]).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });
});
