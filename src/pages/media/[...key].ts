import type { APIRoute } from 'astro';
import { findManagedImage } from '../../lib/notes-repo';
import { signImageDownload } from '../../lib/object-storage';
import { isManagedImageKey } from '../../lib/uploads';
import { getActiveSession } from '../../lib/session-repo';
import { SESSION_COOKIE_NAME } from '../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
  const denied = () => new Response('Imagen no encontrada', { status: 404, headers });
  const key = params.key ?? '';
  if (!isManagedImageKey(key)) return denied();
  try {
    const image = await findManagedImage(key);
    if (!image) return denied();
    if (image.draft) {
      const token = cookies.get(SESSION_COOKIE_NAME)?.value;
      if (!token || !await getActiveSession(token)) return denied();
    }
    const url = await signImageDownload(key);
    return new Response(null, { status: 302, headers: { ...headers, Location: url } });
  } catch {
    return new Response('No se pudo cargar la imagen', { status: 503, headers });
  }
};
