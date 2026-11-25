# Security

Please report vulnerabilities privately to the repository owner. Do not include live credentials or invitation links in public issues.

## Authentication model

Passwords use Node.js scrypt with a random salt. Session tokens contain 256 bits of randomness; only their SHA-256 hashes are stored. Cookies are HttpOnly, host-scoped and SameSite=Lax, with Secure enabled for HTTPS origins. Sessions expire after 14 days. Logout revokes the current session; password changes and administrative access changes revoke all sessions for that user.

The initial administrator requires SETUP_TOKEN and is created under a PostgreSQL transaction lock. Setup cannot run once any account exists. Remove SETUP_TOKEN after setup. Registration defaults to invitations. Invitations are random, expire, are single-use and can be revoked. Only invite hashes are stored. Closed registration rejects even valid invitations for new accounts.

Steam authentication verifies the assertion with the fixed HTTPS Steam endpoint, checks the signed identity and callback, requires a browser-bound one-time state and rejects expired/replayed nonces. New Steam accounts follow the same registration policy as local accounts. Existing Steam accounts can still sign in when registration is closed. Steam IDs never automatically link to local accounts with matching names. Local names starting with steam_ are reserved. Steam passwords are never entered into this application.

Authenticated JSON mutation endpoints verify the request Origin against PUBLIC_ORIGIN. Login, registration, setup and administration use database-backed rate limits. Games interaction limits remain process-local.

## Deployment

Use a dedicated database and database account. PUBLIC_ORIGIN must exactly match the external origin. Use HTTPS outside localhost. TRUST_PROXY defaults to false, sharing an IP rate-limit bucket between clients. Enable it only when the reverse proxy overwrites X-Forwarded-For and direct access to the app is blocked. The supplied Compose app port binds to loopback.

Never publish .env.local, production databases, session tokens or invite URLs. Standalone game participation IDs use a local: prefix. Existing games participation must be deliberately mapped to retain ownership.

No password recovery email or local MFA is implemented. Maintain access to an administrator account. Steam-only accounts authenticate through Steam and cannot set a local password through the profile page.

## Site identity settings

Only administrators can change the site name or icon. Icon uploads are limited to 512 KB and 16 million input pixels, validated as PNG, JPEG or WebP, and re-encoded as a single 512 × 512 PNG. SVG and animated input are not accepted. The request body is bounded before JSON parsing. Uploaded metadata is not retained. Icon bytes and their hash live in the existing PostgreSQL settings record. Public icon URLs contain only a content hash.

## Reverse Proxy und Login-Limits

Hinter einem Reverse Proxy **muss `TRUST_PROXY=true` gesetzt werden**. Der Proxy muss `X-Forwarded-For` überschreiben oder seine tatsächlich beobachtete Client-IP rechts anhängen. Direkter Zugriff auf die App muss gesperrt sein. `TRUSTED_PROXY_HOPS=1` liest den rechten Eintrag; nur bei einer kontrollierten mehrstufigen Proxy-Kette erhöhen. Ungültige Adressen ergeben `unknown`. Ohne vertrauenswürdigen Proxy ist keine Client-IP aus Fetch-Requests verfügbar; dann wird ein gemeinsamer Zähler verwendet. Erkannte Fehlkonfigurationen erzeugen eine Prozesswarnung und einen Admin-Hinweis.

Login zählt nur fehlgeschlagene Passwortprüfungen: 10 Fehler pro Benutzername und IP, 50 pro Benutzername und 60 pro IP innerhalb von 15 Minuten. Eine erfolgreiche Anmeldung setzt diese Fehlerzähler zurück. Registrierung, Setup und Steam-Start zählen weiterhin jeden Versuch.
