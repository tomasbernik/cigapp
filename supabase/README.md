# Supabase setup for CigApp

## 1. Open the CigApp Supabase project

Use this project for CigApp:

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
- `adjustments`

All four tables use Supabase Auth user IDs and Row Level Security, so the public browser key cannot read or write another user's data.

## 3. Enable auth

Use Supabase email/password auth internally. The app shows this as username/password.

1. Open **Authentication > Providers**.
2. Enable **Email**.
3. Turn off mandatory email confirmation in the Email provider settings.
4. In **Authentication > URL Configuration**, add the app URL to allowed redirect URLs.

The app converts usernames to internal auth emails like `meno@cigapp.invalid`, so users do not need to provide a real email address.

For local testing, add:

```text
http://localhost:8000
```

## 4. Legacy app config

This directory documents the previous Supabase backend for rollback and data
migration only. The active browser app no longer reads Supabase configuration.

Do not add even publishable API keys to the repository. Retrieve any legacy
runtime value from the Supabase dashboard only when an explicitly approved
migration or rollback needs it. Never put a `service_role` key in browser code.
