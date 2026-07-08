-- CigLog Supabase schema
-- Run this in Supabase Dashboard > SQL Editor.

create table if not exists public.packs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  capacity integer not null check (capacity > 0),
  active boolean not null default false,
  opened_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id text not null references public.packs(id) on delete cascade,
  remaining integer not null check (remaining >= 0),
  created_at timestamptz not null
);

create table if not exists public.days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  tags text[] not null default '{}',
  stress integer not null default 0 check (stress >= 0 and stress <= 5),
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists packs_user_id_opened_at_idx
  on public.packs (user_id, opened_at desc);

create index if not exists entries_user_id_created_at_idx
  on public.entries (user_id, created_at desc);

create index if not exists entries_pack_id_created_at_idx
  on public.entries (pack_id, created_at);

alter table public.packs enable row level security;
alter table public.entries enable row level security;
alter table public.days enable row level security;

drop policy if exists "Users can read own packs" on public.packs;
create policy "Users can read own packs"
  on public.packs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own packs" on public.packs;
create policy "Users can insert own packs"
  on public.packs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own packs" on public.packs;
create policy "Users can update own packs"
  on public.packs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own packs" on public.packs;
create policy "Users can delete own packs"
  on public.packs for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own entries" on public.entries;
create policy "Users can read own entries"
  on public.entries for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own entries" on public.entries;
create policy "Users can insert own entries"
  on public.entries for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.packs
      where packs.id = entries.pack_id
      and packs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own entries" on public.entries;
create policy "Users can update own entries"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.packs
      where packs.id = entries.pack_id
      and packs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own entries" on public.entries;
create policy "Users can delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own days" on public.days;
create policy "Users can read own days"
  on public.days for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own days" on public.days;
create policy "Users can insert own days"
  on public.days for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own days" on public.days;
create policy "Users can update own days"
  on public.days for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own days" on public.days;
create policy "Users can delete own days"
  on public.days for delete
  using (auth.uid() = user_id);
