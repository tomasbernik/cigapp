# Safe Supabase-to-Neon migration plan

Do not import the shared Supabase database. Do not delete, disable, or modify the
old project during migration.

1. Create an isolated Neon branch from the production Neon branch and apply
   `schema.sql` there. Run the RLS integration test with two disposable users.
2. Inventory only CigApp identities (`*@cigapp.invalid`) and the four CigApp
   tables in Supabase. Take an encrypted, access-controlled backup before any
   transformation.
3. Establish each identity in Neon Auth. Supabase password hashes should not be
   copied into Neon Auth. Use a deliverable email identity and numeric email OTP;
   never create an account that can only receive mail at `cigapp.invalid`. Record
   a temporary old-Supabase-UUID to new-Neon-UUID mapping; never commit it.
4. With a one-off server-side migration script and credentials supplied only at
   runtime, export rows for mapped CigApp users from `packs`, `entries`, `days`,
   and `adjustments`. Reject rows belonging to unmapped users. Never put
   service-role keys or connection strings in browser code or Git.
5. Import in a transaction, remapping `user_id` and preserving application IDs:
   `packs`, then `days` and `adjustments`, then `entries`. Keep the composite
   `(pack_id, user_id)` foreign key enabled during import.
6. Compare per-user/per-table row counts, orphan counts, min/max timestamps, and
   deterministic checksums of business columns. Sign in as two users and repeat
   the anonymous/cross-user RLS checks.
7. Schedule a short write freeze, export only rows changed since the first
   export, import and verify the delta, then update the two public URLs and
   deploy the frontend. Keep Supabase available for rollback; do not change its
   service configuration without separate approval.
8. After an agreed observation period, decide separately whether old CigApp
   data should be archived. This migration never authorizes deleting the shared
   Supabase project or its data.
