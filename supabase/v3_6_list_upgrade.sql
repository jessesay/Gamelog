-- GameLog v3.6 Letterboxd-style list upgrade.
-- Safe to run after the existing GameLog schema/migrations on a live database.
-- This migration is intentionally incremental and idempotent.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '2min';

-- List privacy. Existing lists remain public to preserve their current behavior.
alter table public.game_lists
  add column if not exists is_public boolean;

update public.game_lists
set is_public = true
where is_public is null;

alter table public.game_lists
  alter column is_public set default true,
  alter column is_public set not null;

-- Stable list ordering used by the owner editor and public list page.
alter table public.list_items
  add column if not exists position integer;

-- Older versions could contain duplicate memberships. Keep the earliest/highest
-- ranked copy before enforcing the API's one-game-per-list contract.
with ranked_duplicates as (
  select
    id,
    row_number() over (
      partition by list_id, game_id
      order by position asc nulls last, created_at asc, id asc
    ) as duplicate_rank
  from public.list_items
)
delete from public.list_items item
using ranked_duplicates duplicate
where item.id = duplicate.id
  and duplicate.duplicate_rank > 1;

-- Preserve the relative order of existing rows while filling gaps/nulls with a
-- deterministic zero-based sequence. The API may then move rows safely.
with normalized_positions as (
  select
    id,
    row_number() over (
      partition by list_id
      order by position asc nulls last, created_at asc, id asc
    ) - 1 as normalized_position
  from public.list_items
)
update public.list_items item
set position = normalized.normalized_position
from normalized_positions normalized
where item.id = normalized.id
  and item.position is distinct from normalized.normalized_position;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.list_items'::regclass
      and conname = 'list_items_position_nonnegative'
  ) then
    alter table public.list_items
      add constraint list_items_position_nonnegative
      check (position is null or position >= 0)
      not valid;
  end if;
end
$$;

alter table public.list_items
  validate constraint list_items_position_nonnegative;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.list_items'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (list_id, game_id)'
  ) and not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'list_items'
      and indexdef like 'CREATE UNIQUE INDEX % (list_id, game_id)'
  ) then
    create unique index list_items_list_game_unique_idx
      on public.list_items (list_id, game_id);
  end if;
end
$$;

create index if not exists list_items_list_position_idx
  on public.list_items (list_id, position asc nulls last, created_at asc);

create index if not exists game_lists_public_profile_idx
  on public.game_lists (user_id, created_at desc)
  where is_public = true;

-- Public list creation uses the existing `listed` activity type with
-- metadata.action = 'created-list'. Ensure the list relationship is available
-- without changing the production event-type constraint.
alter table public.activity_events
  add column if not exists list_id uuid;

do $$
declare
  list_fk_name text;
begin
  select conname
  into list_fk_name
    from pg_constraint
    where conrelid = 'public.activity_events'::regclass
      and contype = 'f'
      and confrelid = 'public.game_lists'::regclass
      and pg_get_constraintdef(oid) like 'FOREIGN KEY (list_id)%'
    limit 1;

  if list_fk_name is null then
    alter table public.activity_events
      add constraint activity_events_list_id_fkey
      foreign key (list_id)
      references public.game_lists(id)
      on delete cascade
      not valid;
    list_fk_name := 'activity_events_list_id_fkey';
  end if;

  execute format(
    'alter table public.activity_events validate constraint %I',
    list_fk_name
  );
end
$$;

create index if not exists activity_events_public_list_created_idx
  on public.activity_events (list_id, created_at desc)
  where event_type = 'listed'
    and metadata ->> 'action' = 'created-list';

-- Cover fallback is derived from the first game cover and a generated gradient
-- in the application. No nullable cover column or data backfill is required.

-- Replace legacy public-everything policies with owner-aware visibility.
alter table public.game_lists enable row level security;
alter table public.list_items enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists "lists are public" on public.game_lists;
drop policy if exists "lists are visible" on public.game_lists;
create policy "lists are visible"
on public.game_lists
for select
using (is_public or auth.uid() = user_id);

drop policy if exists "users can insert own lists" on public.game_lists;
create policy "users can insert own lists"
on public.game_lists
for insert
with check (auth.uid() = user_id);

drop policy if exists "users can update own lists" on public.game_lists;
create policy "users can update own lists"
on public.game_lists
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own lists" on public.game_lists;
create policy "users can delete own lists"
on public.game_lists
for delete
using (auth.uid() = user_id);

drop policy if exists "list items are public" on public.list_items;
drop policy if exists "list items are visible" on public.list_items;
create policy "list items are visible"
on public.list_items
for select
using (
  exists (
    select 1
    from public.game_lists list
    where list.id = list_items.list_id
      and (list.is_public or list.user_id = auth.uid())
  )
);

drop policy if exists "list owners can insert list items" on public.list_items;
create policy "list owners can insert list items"
on public.list_items
for insert
with check (
  exists (
    select 1
    from public.game_lists list
    where list.id = list_items.list_id
      and list.user_id = auth.uid()
  )
);

drop policy if exists "list owners can update list items" on public.list_items;
create policy "list owners can update list items"
on public.list_items
for update
using (
  exists (
    select 1
    from public.game_lists list
    where list.id = list_items.list_id
      and list.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.game_lists list
    where list.id = list_items.list_id
      and list.user_id = auth.uid()
  )
);

drop policy if exists "list owners can delete list items" on public.list_items;
create policy "list owners can delete list items"
on public.list_items
for delete
using (
  exists (
    select 1
    from public.game_lists list
    where list.id = list_items.list_id
      and list.user_id = auth.uid()
  )
);

-- Keep ordinary activity events public, but only expose list-creation events
-- while their parent list remains public.
drop policy if exists "activity events are public" on public.activity_events;
drop policy if exists "activity events are visible" on public.activity_events;
create policy "activity events are visible"
on public.activity_events
for select
using (
  metadata ->> 'action' is distinct from 'created-list'
  or exists (
    select 1
    from public.game_lists list
    where list.id = activity_events.list_id
      and list.is_public = true
  )
);

drop policy if exists "users can insert own activity events" on public.activity_events;
create policy "users can insert own activity events"
on public.activity_events
for insert
with check (
  auth.uid() = user_id
  and (
    metadata ->> 'action' is distinct from 'created-list'
    or exists (
      select 1
      from public.game_lists list
      where list.id = activity_events.list_id
        and list.user_id = auth.uid()
        and list.is_public = true
    )
  )
);

-- Supabase normally grants these through its default schema setup. Repeating
-- the grants is harmless and makes owner/public access explicit.
grant select on public.game_lists, public.list_items to anon;
grant select, insert, update, delete on public.game_lists, public.list_items to authenticated;
grant select on public.activity_events to anon;
grant select, insert on public.activity_events to authenticated;

commit;
