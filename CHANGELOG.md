# Changelog

## 1.3.0

- Fehlgeschlagene Anmeldungen pro Benutzer und vertrauenswürdiger Client-IP begrenzen; Proxy-Warnung und konfigurierbare Hop-Anzahl.
- Einheitliche öffentliche Fehler ohne Datenbankdetails; begrenzte Steam-IDs.
- Einmalige Admin-Reset-Links, Notfallskript und Sitzungswiderruf.
- Datenbankbasierte Community-Limits, Kommentar-Moderation und Cursor-Paginierung; transaktionale Votes.
- Gesperrte Nutzer aus Bewertungen ausblenden; eindeutige Anzeigenamen und deterministische Steam-Metadaten.
- Versionierte Migrationen von 1.2.0 mit archivierten Alt-Datensätzen und echten Nutzer-Fremdschlüsseln.
- Persönlicher JSON-Export und Kontolöschung mit Schutz des letzten aktiven Admins.
- CSP-Nonces, HTTPS-HSTS, Docker-Healthchecks und Backup-Anleitung.
- ESLint, Audit, node:test-Integration, Upgrade- und Docker-Build-Prüfungen; feste Action-SHAs und Dependabot.


## 1.2.0

* Renamed the application and repository to GameQueue with neutral default artwork.
* Added administrator settings for the site name and icon, including preview and reset.
* Store uploaded icons in PostgreSQL; validate raster input and normalize it to PNG.
* Update navigation, page titles, favicons and bookmarks from the saved site settings.
* Retain existing accounts, invitations and session cookies during upgrades.

## 1.1.0

Initial standalone edition, extracted from `cr1ms0n-suite/games-app`.

* Removed Hub SSO, shared cookies, internal auth proxy and platform navigation.
* Added one-time administrator setup, local accounts and database-backed sessions.
* Added open, invite-only and closed registration, including Steam admission rules.
* Added Steam OpenID sign-in with provider verification, state binding and nonce replay checks.
* Added user administration, invitation revocation and local profile/password settings.
* Added Docker Compose, CI, security tests and installation documentation.
