import type { APIRoute } from 'astro';
import { listPublishedNoteSlugs } from '../lib/notes-repo';
import { SITE_ORIGIN, OPERATIVES_PATH, notePath } from '../lib/seo';

export const prerender = false;

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export const GET: APIRoute = async () => {
  try {
    const slugs = await listPublishedNoteSlugs();
    const paths = slugs.length ? ['/', OPERATIVES_PATH, ...slugs.map(notePath)] : ['/'];
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...paths.map((path) => `  <url><loc>${escapeXml(`${SITE_ORIGIN}${path}`)}</loc></url>`),
      '</urlset>',
      '',
    ].join('\n');

    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  } catch {
    return new Response('No se pudo cargar el mapa del sitio', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Retry-After': '60',
      },
    });
  }
};
