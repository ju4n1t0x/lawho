# Login — Delta

## MODIFIED Requirements

### Requirement: Login Submission

On form submission, the island MUST verify credentials against the DB via `checkPassword`, create a session, set the session cookie, and redirect to `/escritor/` (read-only) — the dashboard when logged in.

(Previously: redirected to `/escritor/nueva` (read-only) after login)

#### Scenario: Successful login

- GIVEN valid credentials are submitted
- WHEN the island processes the POST
- THEN a session row MUST be created
- AND the session cookie MUST be set
- AND the response MUST redirect to `/escritor/` (read-only)

#### Scenario: Wrong password

- GIVEN incorrect credentials are submitted
- WHEN the island processes the POST
- THEN no session MUST be created
- AND a Spanish error message MUST be displayed (e.g., "Credenciales incorrectas")

#### Scenario: Inactive user

- GIVEN credentials for a user with `is_active = false`
- WHEN the island processes the POST
- THEN login MUST be denied with a Spanish error message

#### Scenario: DB unavailable

- GIVEN PostgreSQL is unreachable
- WHEN the island processes the POST
- THEN a generic Spanish error MUST be shown; credentials MUST NOT leak in the error

### Requirement: Login Page Route

The system MUST serve `/escritor/` (read-only) as an on-demand page (`prerender = false`). When authenticated (`Astro.locals.user` present), the page MUST render the note-list dashboard. When unauthenticated, the page MUST mount a `<LoginForm server:defer />` server island.

(Previously: always rendered the LoginForm island)

#### Scenario: Authenticated user sees dashboard

- GIVEN a valid session cookie
- WHEN a user visits `/escritor/` (read-only)
- THEN the note-list dashboard MUST be rendered

#### Scenario: Unauthenticated user sees login form

- GIVEN no session cookie
- WHEN a user visits `/escritor/` (read-only)
- THEN the LoginForm island MUST be rendered

#### Scenario: On-demand rendering

- GIVEN the page is on-demand
- WHEN visited
- THEN it MUST NOT be statically prerendered

### Requirement: Unauthenticated Redirect

Unauthenticated access to protected `/escritor/**` (read-only) routes (other than `/escritor/` (read-only) itself) MUST redirect to `/escritor/` (read-only).

(Previously: redirected to `/escritor/` (read-only) which always showed login form)

#### Scenario: Unauthenticated redirect

- GIVEN no valid session cookie
- WHEN a user visits `/escritor/nueva` (read-only)
- THEN the response MUST redirect to `/escritor/` (read-only)

#### Scenario: Redirect lands on login form

- GIVEN the redirect from an unauthenticated protected route
- WHEN the user arrives at `/escritor/` (read-only)
- THEN the login form MUST be displayed (not the dashboard)
