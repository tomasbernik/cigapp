# Supabase setup for CigLog

## 1. Open the CigLog Supabase project

Use this project for CigLog:

```text
https://zaibtcbpfjnraefxopsv.supabase.co
```

The older `Nemecka-citanka` project should stay separate.

## 2. Create the database tables

In Supabase Dashboard:

1. Open **SQL Editor**.
2. Paste `supabase/schema.sql`.
3. Click **Run**.

This creates:

- `packs`
- `entries`
- `days`

All three tables use Supabase Auth user IDs and Row Level Security, so the public browser key cannot read or write another user's data.

## 3. Enable an auth method

For the first version, use email magic links:

1. Open **Authentication > Providers**.
2. Enable **Email**.
3. In **Authentication > URL Configuration**, add the app URL to allowed redirect URLs.

For local testing, add:

```text
http://localhost:8000
```

## 4. App config

The browser app uses these public Supabase values in `app.js`:

- Project URL: `https://zaibtcbpfjnraefxopsv.supabase.co`
- Publishable key: `sb_publishable_q13caChpMM7g11n5dFdTSA_n9XHlVCO`

The publishable key is safe to ship in browser code. Never put the `service_role` key in this app.
