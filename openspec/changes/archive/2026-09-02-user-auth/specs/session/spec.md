# Session Specification

## Purpose

Defines DB-backed session management: token generation, cookie transport, sliding TTL, and logout invalidation.

## Requirements

### Requirement: Sessions Table

The system MUST maintain a `sessions` table with columns: `id` (primary key), `user_id` (FK to users), `token` (unique, indexed), `created_at`, `expires_at`, `last_seen_at`.

#### Scenario: Table exists after migration

- GIVEN migrations have been applied
- WHEN the `sessions` table is queried
- THEN it MUST exist with all specified columns

### Requirement: Token Generation

On login, the system MUST generate a cryptographically random 256-bit token, store it in the `sessions` table, and set it as an httpOnly cookie.

#### Scenario: Token created on login

- GIVEN valid credentials are submitted
- WHEN the login handler succeeds
- THEN a new row MUST be inserted into `sessions` with a 256-bit random token
- AND the cookie MUST be set with `httpOnly: true`, `sameSite: 'lax'`, `secure: true` (in production)

#### Scenario: Cookie flags in production

- GIVEN the server is running in production (HTTPS)
- WHEN the session cookie is set
- THEN the cookie MUST have `secure: true`

#### Scenario: Cookie flags in development

- GIVEN the server is running locally (HTTP)
- WHEN the session cookie is set
- THEN the cookie MUST have `httpOnly: true` and `sameSite: 'lax'`; `secure` MAY be omitted

### Requirement: Server-Side Token Verification

Every request to a protected route MUST re-verify the session token against the DB. The system MUST NOT trust the cookie alone.

#### Scenario: Valid token accepted

- GIVEN a cookie with a token matching a non-expired `sessions` row
- WHEN a protected route is accessed
- THEN access MUST be granted

#### Scenario: Tampered token rejected

- GIVEN a cookie with a token not present in `sessions`
- WHEN a protected route is accessed
- THEN access MUST be denied; the user MUST be redirected to login

#### Scenario: Expired session rejected

- GIVEN a `sessions` row with `expires_at` in the past
- WHEN a protected route is accessed with that token
- THEN access MUST be denied; the session row SHOULD be deleted

### Requirement: Sliding TTL

The session TTL is controlled by `SESSION_TTL_MS` (default 24h). On each authenticated request, `last_seen_at` MUST be updated and `expires_at` MUST be extended by `SESSION_TTL_MS` from now.

#### Scenario: TTL extended on activity

- GIVEN a session with `expires_at` 24h from creation
- WHEN the user makes a request 12h later
- THEN `expires_at` MUST be updated to 24h from the current time
- AND `last_seen_at` MUST be updated

#### Scenario: Session expires after inactivity

- GIVEN a session last seen 25h ago with `SESSION_TTL_MS=86400000`
- WHEN the user makes a request
- THEN access MUST be denied (session expired)

### Requirement: Logout

Logout MUST delete the session row from the DB and clear the cookie.

#### Scenario: Logout invalidates session

- GIVEN an active session
- WHEN logout is triggered
- THEN the `sessions` row MUST be deleted
- AND the cookie MUST be cleared (Max-Age=0 or past expiry)

#### Scenario: Post-logout access denied

- GIVEN a session that was logged out
- WHEN the old cookie is presented
- THEN access MUST be denied (row no longer exists)
