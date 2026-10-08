-- One-time production repair after the Supabase-to-Neon Auth migration.
-- CigApp historically used both a real email and the synthetic username email
-- for the same person. Keep the deliverable email identity and move all rows to it.

begin;

do $merge$
declare
  source_id uuid;
  target_id uuid;
begin
  select id into strict source_id
  from neon_auth."user"
  where email = 'tomas@cigapp.invalid';

  select id into strict target_id
  from neon_auth."user"
  where email = 'tomas.bernik@gmail.com';

  if exists (
    select 1
    from public.days source_day
    join public.days target_day
      on target_day.user_id = target_id
     and target_day.day = source_day.day
    where source_day.user_id = source_id
      and row(source_day.tags, source_day.stress, source_day.note, source_day.updated_at)
          is distinct from
          row(target_day.tags, target_day.stress, target_day.note, target_day.updated_at)
  ) then
    raise exception 'Conflicting daily records prevent a safe user merge';
  end if;

  delete from public.days source_day
  where source_day.user_id = source_id
    and exists (
      select 1
      from public.days target_day
      where target_day.user_id = target_id
        and target_day.day = source_day.day
    );

  update public.days set user_id = target_id where user_id = source_id;
  update public.adjustments set user_id = target_id where user_id = source_id;

  alter table public.entries drop constraint entries_pack_user_fk;
  update public.packs set user_id = target_id where user_id = source_id;
  update public.entries set user_id = target_id where user_id = source_id;
  alter table public.entries
    add constraint entries_pack_user_fk foreign key (pack_id, user_id)
    references public.packs(id, user_id) on delete cascade;

  if exists (
    select 1 from public.packs where user_id = source_id
    union all
    select 1 from public.entries where user_id = source_id
    union all
    select 1 from public.days where user_id = source_id
    union all
    select 1 from public.adjustments where user_id = source_id
  ) then
    raise exception 'Legacy user still owns CigApp rows after merge';
  end if;

  delete from neon_auth."user" where id = source_id;
end
$merge$;

commit;
