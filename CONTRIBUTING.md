# Contributing

Use Node.js 24 or newer and PostgreSQL 17 or newer. Run npm ci, npm run setup:env and configure your own .env.local. Never commit that file.

Before submitting changes:

```sh
npm run lint
npm test
npm run typecheck
npm run build
npm run test:upgrade
```

The integration suite requires a running app and a fresh disposable database. Set TEST_BASE_URL, PUBLIC_ORIGIN, TEST_SETUP_TOKEN, DATABASE_URL and TEST_DATABASE_DISPOSABLE=1, then run npm run test:integration. The app's SETUP_TOKEN must equal TEST_SETUP_TOKEN. The suite refuses a database containing existing users. It creates test accounts and modifies test records, so never point it at production.

Set TRUST_PROXY=true in the disposable integration environment so forwarded-client tests use distinct IPs. The upgrade test creates and drops its own temporary database, so the test database user needs CREATEDB permission. Never grant this solely for ordinary production operation. CI starts PostgreSQL 17 and runs the full suite, an audit and a Docker build. Live Steam sign-in is a separate manual check requiring a public HTTPS origin and an actual Steam account.
