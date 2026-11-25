# Changelog

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
