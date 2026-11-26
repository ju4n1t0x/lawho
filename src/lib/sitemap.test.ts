import { readFile } from 'node:fs/promises';
import type { APIContext } from 'astro';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('./db', () => ({ getPool: () => ({ query }) }));

import { GET, prerender } from '../pages/sitemap.xml';

const home = 'https://lawho.com.ar/';
const listing = `${home}operativos-de-salud/`;
const publishedSlugsQuery =
  /^SELECT slug FROM notes WHERE draft = false AND deleted_at IS NULL ORDER BY date DESC, id DESC$/i;

function requestSitemap() {
  const url = new URL('https://preview.example.test/sitemap.xml');
  return GET({ url, request: new Request(url) } as APIContext);
}

function expectReadOnlyQuery() {
  expect(query.mock.calls).toEqual([[expect.stringMatching(publishedSlugsQuery)]]);
}

async function expectSitemap(response: Response, locations: string[]) {
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8');
  expect(await response.text()).toBe([
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations.map((location) => `  <url><loc>${location}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n'));
}

beforeEach(() => {
  query.mockReset();
});

describe('public sitemap', () => {
  it('runs on demand and advertises only the canonical home when nothing is published', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    expect(prerender).toBe(false);
    await expectSitemap(await requestSitemap(), [home]);
    expectReadOnlyQuery();
  });

  it('advertises only canonical published paths, with URL encoding and XML escaping', async () => {
    query.mockResolvedValueOnce({ rows: [
      { slug: 'primer-operativo' },
      { slug: "salud & atención/niñ'os?" },
    ] });

    await expectSitemap(await requestSitemap(), [
      home,
      listing,
      `${listing}primer-operativo/`,
      `${listing}salud%20%26%20atenci%C3%B3n%2Fni%C3%B1&apos;os%3F/`,
    ]);
    // The public request reads only slugs, ignores drafts and soft deletes at
    // the query boundary, and issues no session or editorial writes.
    expectReadOnlyQuery();
  });

  it('does not expose an error as an empty catalog and retries the source on the next GET', async () => {
    query.mockRejectedValueOnce(new Error('private database exception'));

    const response = await requestSitemap();
    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('60');
    expect(await response.text()).toBe('No se pudo cargar el mapa del sitio');
    expectReadOnlyQuery();

    query.mockClear().mockResolvedValueOnce({ rows: [] });
    await expectSitemap(await requestSitemap(), [home]);
    expectReadOnlyQuery();
  });

  it('advertises the apex sitemap in robots.txt and preserves the writer exclusion', async () => {
    const robots = await readFile(new URL('../../public/robots.txt', import.meta.url), 'utf-8');
    expect(robots.trimEnd().split(/\r?\n/).filter(Boolean)).toEqual([
      'User-agent: *',
      'Disallow: /escritor/',
      'Sitemap: https://lawho.com.ar/sitemap.xml',
    ]);
  });
});
