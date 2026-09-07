import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE_NAME } from "./lib/session";
import { getActiveSession } from "./lib/session-repo";

/**
 * Populate `Astro.locals.user` from the session cookie for the writer routes,
 * and redirect unauthenticated users away from protected pages.
 *
 * Boundary note: middleware only runs for PAGES. Server islands run in an
 * isolated request context and must re-check the session cookie themselves
 * (see `src/components/server-islands/LoginForm.astro`).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = new URL(context.request.url).pathname;
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  // The landing and blog are public/static; only the writer area is guarded.
  if (!path.startsWith("/escritor")) {
    return next();
  }

  const token = context.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const session = await getActiveSession(token);
    if (session) {
      context.locals.user = {
        id: session.userId,
        email: session.email,
        role: session.role,
      };
    }
  }

  // `/escritor` (login) and `/escritor/logout` (POST) stay reachable.
  const isPublic = path === "/escritor" || path === "/escritor/logout";
  if (!isPublic && !context.locals.user) {
    return context.redirect("/escritor/");
  }

  return next();
});
