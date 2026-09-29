# Neon setup for CigApp

CigApp uses Neon Auth and the Neon Data API. The browser never needs a Postgres
connection string, Neon API key, or owner credentials.

## Public client configuration

Copy the production branch values from Neon Console into `config.js`:

- Auth URL -> `neonAuthUrl`
- Data API URL (ending in `/rest/v1`) -> `neonDataApiUrl`

These endpoint URLs are public identifiers. Do not add `DATABASE_URL`, an API
key, a password, or any other secret to this repository. Without both URLs the
app starts in its existing local/offline mode.

## Schema

`schema.sql` is the reproducible definition for the four application tables,
indexes, ownership constraints, grants, and RLS policies. It expects Neon Auth
to be enabled and therefore references `neon_auth."user"` and `auth.user_id()`.

Review SQL changes before applying them. Do not run the file against production
as part of a frontend deployment; apply database changes as a separate,
explicitly approved operation.

## Verification

Run local contract tests with `pnpm test`. The opt-in integration test is for an
isolated Neon test branch, never the production branch:

```powershell
$env:NEON_AUTH_URL = "https://.../auth"
$env:NEON_DATA_API_URL = "https://.../rest/v1"
$env:NEON_TEST_USER_A_EMAIL = "..."
$env:NEON_TEST_USER_A_PASSWORD = "..."
$env:NEON_TEST_USER_B_EMAIL = "..."
$env:NEON_TEST_USER_B_PASSWORD = "..."
pnpm test:integration
```

Use two disposable users already registered in that test branch. The test adds
and removes only records whose IDs begin with `rls-test-`.
