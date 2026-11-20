# Constitution Amendment Specification

## Purpose

Keep the constitution's explicit dependency allowlist ahead of implementation. The approved Vercel + Neon amendment supersedes the former primary Node-standalone/Docker contract and authorizes the Vercel adapter and S3 SDK before installation. Earlier Tailwind/image amendments remain historical context, not instructions to remove installed dependencies or create commits during an explicitly uncommitted documentation task.

## Requirements

### Requirement: Rule 1 Amendment

The constitution MUST explicitly permit TailwindCSS v4 and `@tailwindcss/vite`, `@astrojs/vercel`, `pg`, `argon2`, `@astrojs/markdown-satteri`, `sharp`, `@aws-sdk/client-s3`, and `@aws-sdk/s3-request-presigner`, each with a one-line rationale. `@astrojs/vercel` replaces `@astrojs/node` as the primary production adapter. Astro 7.x, adapter, Node, and native dependency versions MUST be verified together against Vercel support rather than requiring the outdated exact 7.2 minor. No ORM, second auth system, Redis session dependency, or runtime dotenv is authorized by this amendment.

#### Scenario: Amendment applied before new dependencies

- GIVEN explicit maintainer approval to align the affected contracts
- WHEN this documentation amendment completes
- THEN the constitution and relevant specs MUST explicitly authorize the Vercel adapter and both AWS SDK packages before their installation
- AND this documentation-only task MUST NOT change dependencies, configuration, or application files

#### Scenario: Gate prevents premature dependency

- GIVEN a dependency is not in the approved constitution/specs
- WHEN installation is attempted
- THEN implementation MUST wait for explicit approval and the corresponding contract update

#### Scenario: New deps permitted after amendment

- GIVEN the approved documentation amendment explicitly lists `@astrojs/vercel`, `@aws-sdk/client-s3`, and `@aws-sdk/s3-request-presigner`
- WHEN the subsequent implementation task installs compatible versions
- THEN installation MUST be allowed while reusing existing `pg`, `argon2`, and `sharp`
- AND a separate amendment commit MUST NOT be required when the maintainer explicitly requested no commits

#### Scenario: Unlisted dep still blocked

- GIVEN the approved allowlist
- WHEN a developer attempts to add `express` to `package.json`
- THEN the apply phase MUST refuse to proceed; `express` is not in the sanctioned list

### Requirement: Rule 1 Amendment (sharp)

The constitution MUST retain `sharp` as an explicit exception for the `astro:assets` build pipeline and existing Node-side editorial image optimization. The deployment migration MUST preserve JPEG/PNG validation, the inclusive 5 MiB input cap, dimension guards, EXIF stripping, and format-preserving optimization; it MUST NOT replace server validation with client MIME claims.

#### Scenario: Amendment applied before sharp install

- GIVEN a future change needs a newly unlisted image-processing dependency
- WHEN the amendment task completes
- THEN its explicit exception and rationale MUST exist before installation
- AND the existing authorized `sharp` dependency MUST NOT be removed merely to replay a historical amendment

#### Scenario: Gate prevents premature dependency

- GIVEN an image dependency is not authorized
- WHEN a developer attempts to add it
- THEN the apply phase MUST require the approved contract amendment first

#### Scenario: Sharp permitted after amendment

- GIVEN the approved constitution lists `sharp`
- WHEN a developer runs `pnpm add sharp`
- THEN the apply phase MUST allow the install to proceed

#### Scenario: Unlisted dep still blocked

- GIVEN the approved allowlist includes `sharp` but not the proposed new dependency
- WHEN a developer attempts to add an unlisted dependency to `package.json`
- THEN the apply phase MUST refuse to proceed; unlisted dep is not in the sanctioned list

### Requirement: Amendment Ordering and Scope

Approved constitution/specification edits MUST precede dependency/configuration/application implementation. This replaces the historical requirement to create a separate amendment commit as an installation gate. Commit boundaries MUST follow the maintainer's current workflow; an explicit documentation-only/no-commits instruction MUST be respected. Integrate via `dev`, never directly into `main` without maintainer confirmation.

#### Scenario: Documentation-first handoff

- GIVEN the authorized scope is constitution, AGENTS, and affected specifications only
- WHEN the alignment is delivered
- THEN new dependencies MUST be explicitly permitted without being installed in that task
- AND unrelated dirty files MUST remain intact and no commit MUST be created
