# Architecture

Next.js serves the UI and route handlers. PostgreSQL stores games, participation, accounts, hashed sessions/invitations/reset tokens, admission settings and limits. Steam OpenID verification, initial setup locks and last-admin protection remain mandatory.

## Modules

- `src/lib/db/pool.ts`: shared PostgreSQL pool.
- `src/lib/db/migrate.ts`: checksummed SQL migrations with a session advisory lock and one transaction per migration.
- `src/lib/repos/`: games, votes, comments, users and settings. Participation references `app_users` by foreign key; names are joined live.
- `src/lib/auth/`: sessions, admission transactions, limits and password recovery.
- `src/lib/errors.ts`: the only public JSON error boundary.

`npm start` and the Docker command run `scripts/start.mjs` before loading the standalone server. This keeps migration execution outside requests and avoids requiring a database during `next build`. Development runs migrations before starting Next. `npm run migrate` is available for operators. The standalone package includes SQL, scripts and the small TypeScript library sources needed by Node 24 command-line tools. No new runtime dependency is required.

Unmatched historical ownership is preserved in `legacy_orphans`. Invalid or conflicting display names are archived before replacement; existing usernames and credentials are preserved. See the upgrade section in README before updating 1.2.0.

## Provenance

Extracted from cr1ms0nx64/cr1ms0n-suite, commit f60cd227bffe583e1b87c1c97dc5598cd0623ab6, directory games-app. Original MIT attribution is retained. There is no Hub, ACP, Redis or shared cookie service.
