# Deploy Nginx Specification

## Purpose

Optional legacy operational reference for self-hosted Nginx and existing local images. Retired as the primary production contract: Vercel Node and private Neon Object Storage delivery are defined by `docker-deploy` and `image-upload`. No Nginx deployment, upload alias, or persistent volume is required for Vercel.

## Requirements

### Requirement: Nginx Config Example

The existing `deploy/nginx.conf.example` MAY be retained as documentation for an explicitly selected legacy deployment; it MUST NOT be treated as Vercel configuration or deleted/rewritten without authorization. The following proxy/static-file requirements apply only when that optional legacy deployment is maintained.

#### Scenario: Example file exists

- GIVEN the repository
- WHEN `deploy/nginx.conf.example` is read
- THEN it MUST contain a valid Nginx server block

#### Scenario: Config is an example, not enforced

- GIVEN the example file
- WHEN the apply phase runs
- THEN it MUST NOT modify or validate against this file (documentation only)

### Requirement: Reverse Proxy to Astro Node

An explicitly maintained legacy vhost MUST reverse-proxy application requests to its separately verified standalone Astro Node server (default `localhost:4321` or configurable upstream). Vercel function artifacts MUST NOT be assumed to expose this standalone upstream.

#### Scenario: Proxy pass configured

- GIVEN the nginx.conf.example
- WHEN inspected
- THEN it MUST contain a `proxy_pass` directive targeting the Astro Node server

#### Scenario: Headers forwarded

- GIVEN a request proxied to Astro
- THEN `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers MUST be set

### Requirement: Static Uploads Serving

A legacy vhost MAY keep serving existing `/uploads/**` directly from its verified local upload path during transition. This MUST NOT become the destination for new Vercel uploads. Keep existing URLs readable until verified transfer/backfill updates their references; seed URLs do not prove source files exist. Never remove local originals automatically. Managed `/media/<key>` delivery MUST use the application's access-checked fresh signed-GET redirect, not a public Nginx alias to pending/private objects.

#### Scenario: Upload served by Nginx

- GIVEN a request to `/uploads/notes/slug/photo.jpg` (read-only)
- WHEN Nginx processes it
- THEN the file MUST be served directly from disk; the request MUST NOT reach the Astro process

#### Scenario: Upload path matches UPLOADS_DIR

- GIVEN the nginx config
- WHEN inspected
- THEN the `root` or `alias` for `/uploads/` (read-only) MUST correspond to `UPLOADS_DIR`

### Requirement: TLS-Ready Headers

The vhost SHOULD include headers suitable for a TLS-terminated deployment (`Strict-Transport-Security`, `X-Content-Type-Options`, etc.).

#### Scenario: Security headers present

- GIVEN the nginx.conf.example
- WHEN inspected
- THEN it SHOULD include `add_header Strict-Transport-Security` and `X-Content-Type-Options: nosniff`

### Requirement: Dev Subdomain Documentation

The development guide MUST document route-based `/escritor/**` access on localhost without requiring Nginx or a custom subdomain. A legacy `auth.lawho.local` hosts-file setup MAY be documented as optional. Storage CORS MUST include explicit allowed localhost/Preview/production origins rather than relying on this proxy for authorization.

#### Scenario: Dev setup documented

- GIVEN the README or deploy docs
- WHEN inspected
- THEN they MUST explain how to access the writer routes locally
