import type { APIRoute } from "astro";
import { clearSessionCookieOptions, SESSION_COOKIE_NAME } from "../../lib/session";
import { deleteSessionByToken } from "../../lib/session-repo";

export const prerender = false;

/**
 * POST /escritor/logout — delete the session row and clear the cookie,
 * then redirect back to the login page.
 */
export const POST: APIRoute = async ({ cookies, redirect }) => {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await deleteSessionByToken(token);
  }
  cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
  return redirect("/escritor/");
};
