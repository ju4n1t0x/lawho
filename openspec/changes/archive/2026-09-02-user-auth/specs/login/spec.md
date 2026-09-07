# Login Specification

## Purpose

Defines the `/escritor/` (read-only) login page, the `LoginForm` server island, logout route, and authentication flow.

## Requirements

### Requirement: Login Page Route

The system MUST serve `/escritor/` (read-only) as an on-demand page (`prerender = false`) that mounts a `<LoginForm server:defer />` server island.

#### Scenario: Login page renders

- GIVEN the server is running
- WHEN a user visits `/escritor/` (read-only)
- THEN the page MUST load with the LoginForm island placeholder

#### Scenario: On-demand rendering

- GIVEN the page is on-demand
- WHEN visited
- THEN it MUST NOT be statically prerendered

### Requirement: LoginForm Server Island

The `<LoginForm>` component MUST be a server island (`server:defer`) that renders a login form with email and password fields. The form MUST POST to the island's endpoint.

#### Scenario: Form renders with fields

- GIVEN the island renders
- WHEN inspecting the HTML
- THEN it MUST contain email and password input fields and a submit button

#### Scenario: Spanish UI

- GIVEN the island renders
- WHEN inspecting labels and messages
- THEN all user-facing text MUST be in Spanish

### Requirement: Login Submission

On form submission, the island MUST verify credentials against the DB via `checkPassword`, create a session, set the session cookie, and redirect to `/escritor/nueva` (read-only).

#### Scenario: Successful login

- GIVEN valid credentials are submitted
- WHEN the island processes the POST
- THEN a session row MUST be created
- AND the session cookie MUST be set
- AND the response MUST redirect to `/escritor/nueva` (read-only)

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

### Requirement: In-Island Session Check

The island MUST check the session cookie internally (islands run in isolated context; page middleware cannot protect them). If a valid session exists, the island MUST render the writer interface instead of the login form.

#### Scenario: Authenticated user sees writer UI

- GIVEN a valid session cookie
- WHEN the island renders
- THEN it MUST show the writer interface (not the login form)

#### Scenario: No session shows login form

- GIVEN no session cookie
- WHEN the island renders
- THEN it MUST show the login form

### Requirement: Logout Route

The system MUST provide a logout route (POST `/escritor/logout` (read-only)) that deletes the session row and clears the cookie, then redirects to `/escritor/` (read-only).

#### Scenario: Logout clears session

- GIVEN an active session
- WHEN POST `/escritor/logout` (read-only) is called
- THEN the session row MUST be deleted
- AND the cookie MUST be cleared
- AND the response MUST redirect to `/escritor/` (read-only)

### Requirement: Unauthenticated Redirect

Unauthenticated access to protected `/escritor/**` (read-only) routes (other than `/escritor/` (read-only) itself) MUST redirect to `/escritor/` (read-only).

#### Scenario: Unauthenticated redirect

- GIVEN no valid session cookie
- WHEN a user visits `/escritor/nueva` (read-only)
- THEN the response MUST redirect to `/escritor/` (read-only)

### Requirement: Writer Section Not Indexable

The writer section MUST NOT be indexable by search engines or robots: the server MUST send an `X-Robots-Tag: noindex, nofollow` header on `/escritor/**` (read-only) responses, and the site MUST ship a `robots.txt` at the site root that disallows `/escritor/`. No public link to the writer section is required; it is reached only by its known URL.

#### Scenario: noindex response header

- GIVEN a response for a `/escritor/**` (read-only) route
- WHEN the response is served
- THEN it MUST include the `X-Robots-Tag: noindex, nofollow` header

#### Scenario: robots.txt disallows writer section

- GIVEN a crawler requests `/robots.txt`
- WHEN the file is served
- THEN it MUST contain a `Disallow` line for `/escritor/`
