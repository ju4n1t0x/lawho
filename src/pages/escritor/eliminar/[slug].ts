import type { APIRoute } from "astro";
import { softDeleteNote } from "../../../lib/notes-repo";

export const prerender = false;

/**
 * POST /escritor/eliminar/[slug] — soft-delete a note by setting `deleted_at`.
 * The middleware already guards this route: only authenticated writers reach
 * this handler. GET requests are rejected with 405.
 */
export const POST: APIRoute = async ({ params, redirect }) => {
  const slug = params.slug;
  if (!slug) {
    return new Response("Slug requerido", { status: 400 });
  }

  await softDeleteNote(slug);
  return redirect("/escritor/");
};

export const GET: APIRoute = async () => {
  return new Response("Method Not Allowed", { status: 405 });
};
