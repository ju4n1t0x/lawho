import type { APIRoute } from 'astro';
import { MAX_UPLOAD_SIZE_BYTES } from 'astro:env/server';
import { SESSION_COOKIE_NAME } from '../../lib/session';
import { getActiveSession } from '../../lib/session-repo';
import { authorizeImageUpload } from '../../lib/object-storage';
import { UploadValidationError } from '../../lib/uploads';
import { isSameOrigin, privateJson } from '../../lib/http-guards';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return privateJson({ error: 'Origen no permitido' }, 403);
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getActiveSession(token) : null;
  if (!session) return privateJson({ error: 'Necesitás iniciar sesión' }, 401);
  if (!request.headers.get('content-type')?.includes('application/json')) return privateJson({ error: 'Solicitud no válida' }, 415);
  try {
    // Read a bounded payload even when Content-Length is absent or forged.
    const reader = request.body?.getReader();
    if (!reader) return privateJson({ error: 'Solicitud no válida' }, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2048) { await reader.cancel(); return privateJson({ error: 'Solicitud demasiado grande' }, 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const result = await authorizeImageUpload(session.userId, input.size, input.contentType, MAX_UPLOAD_SIZE_BYTES);
    return privateJson(result);
  } catch (error) {
    if (error instanceof UploadValidationError) return privateJson({ error: error.message }, 400);
    if (error instanceof SyntaxError || error instanceof TypeError) return privateJson({ error: 'Solicitud no válida' }, 400);
    return privateJson({ error: 'No se pudo autorizar la carga de imagen' }, 503);
  }
};
