-- CigApp schema for Neon Auth + Neon Data API.
-- Apply through the Neon SQL Editor or psql with an owner role.

begin;

create table if not exists public.packs (
  id text primary key,
  user_id uuid not null default (auth.user_id())::uuid
    references neon_auth."user"(id) on delete cascade,
  capacity integer not null check (capacity > 0),
  price numeric(10, 2) check (price >= 0),
  active boolean not null default false,
  opened_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint packs_id_user_id_key unique (id, user_id)
);

create table if not exists public.entries (
  id text primary key,
  user_id uuid not null default (auth.user_id())::uuid
    references neon_auth."user"(id) on delete cascade,
  pack_id text not null,
  remaining integer not null check (remaining >= 0),
  created_at timestamptz not null,
  consumption_date date not null,
  constraint entries_pack_user_fk foreign key (pack_id, user_id)
    references public.packs(id, user_id) on delete cascade
);

create table if not exists public.days (
  user_id uuid not null default (auth.user_id())::uuid
    references neon_auth."user"(id) on delete cascade,
  day date not null,
  tags text[] not null default '{}',
  stress integer not null default 0 check (stress between 0 and 5),
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.adjustments (
  id text primary key,
  user_id uuid not null default (auth.user_id())::uuid
    references neon_auth."user"(id) on delete cascade,
  day date not null,
  amount integer not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists packs_user_id_opened_at_idx on public.packs (user_id, opened_at desc);
create index if not exists entries_user_id_created_at_idx on public.entries (user_id, created_at desc);
create index if not exists entries_user_id_consumption_date_idx on public.entries (user_id, consumption_date desc);
create index if not exists entries_pack_id_created_at_idx on public.entries (pack_id, created_at);
create index if not exists adjustments_user_id_day_idx on public.adjustments (user_id, day desc);

alter table public.packs enable row level security;
alter table public.entries enable row level security;
alter table public.days enable row level security;
alter table public.adjustments enable row level security;

do $policies$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('packs', 'entries', 'days', 'adjustments')
  loop
    execute format('drop policy %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end
$policies$;

create policy "Authenticated users manage own packs"
  on public.packs for all to authenticated
  using ((select auth.user_id())::uuid = user_id)
  with check ((select auth.user_id())::uuid = user_id);
create policy "Authenticated users manage own entries"
  on public.entries for all to authenticated
  using ((select auth.user_id())::uuid = user_id)
  with check ((select auth.user_id())::uuid = user_id);
create policy "Authenticated users manage own days"
  on public.days for all to authenticated
  using ((select auth.user_id())::uuid = user_id)
  with check ((select auth.user_id())::uuid = user_id);
create policy "Authenticated users manage own adjustments"
  on public.adjustments for all to authenticated
  using ((select auth.user_id())::uuid = user_id)
  with check ((select auth.user_id())::uuid = user_id);

grant usage on schema public to authenticated;
revoke all on table public.packs, public.entries, public.days, public.adjustments from public, anonymous;
grant select, insert, update, delete
  on table public.packs, public.entries, public.days, public.adjustments
  to authenticated;

commit;
