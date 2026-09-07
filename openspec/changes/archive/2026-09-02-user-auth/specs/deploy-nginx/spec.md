# Deploy Nginx Specification

## Purpose

Operational reference for the Nginx reverse-proxy configuration serving the Astro Node server and static uploads.

## Requirements

### Requirement: Nginx Config Example

The system MUST provide `deploy/nginx.conf.example` containing a complete vhost configuration for the writer subdomain.

#### Scenario: Example file exists

- GIVEN the repository
- WHEN `deploy/nginx.conf.example` is read
- THEN it MUST contain a valid Nginx server block

#### Scenario: Config is an example, not enforced

- GIVEN the example file
- WHEN the apply phase runs
- THEN it MUST NOT modify or validate against this file (documentation only)

### Requirement: Reverse Proxy to Astro Node

The vhost MUST reverse-proxy application requests to the Astro Node server (default `localhost:4321` or configurable upstream).

#### Scenario: Proxy pass configured

- GIVEN the nginx.conf.example
- WHEN inspected
- THEN it MUST contain a `proxy_pass` directive targeting the Astro Node server

#### Scenario: Headers forwarded

- GIVEN a request proxied to Astro
- THEN `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers MUST be set

### Requirement: Static Uploads Serving

The vhost MUST serve `/uploads/**` (read-only) directly from the `UPLOADS_DIR` filesystem path, bypassing the Astro Node server.

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

The README or config MUST document the dev subdomain setup (`auth.lawho.local` via `/etc/hosts` (read-only) or route-based `/escritor/**` (read-only) path).

#### Scenario: Dev setup documented

- GIVEN the README or deploy docs
- WHEN inspected
- THEN they MUST explain how to access the writer routes locally
