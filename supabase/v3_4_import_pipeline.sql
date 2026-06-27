-- GameLog v3.4 import pipeline support.
-- Run this once in Supabase SQL Editor before npm run catalog:import.

create extension if not exists pgcrypto;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.games add column if not exists source text;
alter table public.games add column if not exists source_id text;
alter table public.games add column if not exists import_key text;
alter table public.games add column if not exists source_url text;
alter table public.games add column if not exists developer text;
alter table public.games add column if not exists publisher text;
alter table public.games add column if not exists release_year int;
alter table public.games add column if not exists genre text;
alter table public.games add column if not exists description text;
alter table public.games add column if not exists summary text;
alter table public.games add column if not exists cover_url text;
alter table public.games add column if not exists background_url text;
alter table public.games add column if not exists platforms text[] default '{}';
alter table public.games add column if not exists genres text[] default '{}';
alter table public.games add column if not exists tags text[] default '{}';
alter table public.games add column if not exists release_date date;
alter table public.games add column if not exists rating numeric;
alter table public.games add column if not exists metacritic integer;
alter table public.games add column if not exists stores jsonb default '[]'::jsonb;
alter table public.games add column if not exists raw jsonb default '{}'::jsonb;
alter table public.games add column if not exists created_by uuid;
alter table public.games add column if not exists is_community boolean not null default false;
alter table public.games add column if not exists imported_at timestamptz;

update public.games
set slug = lower(regexp_replace(coalesce(slug, title), '[^a-z0-9]+', '-', 'g'))
where slug is null;

alter table public.games alter column slug set not null;

create unique index if not exists games_source_source_id_unique
on public.games (source, source_id)
where source is not null and source_id is not null;

create unique index if not exists games_import_key_unique
on public.games (import_key)
where import_key is not null;

create index if not exists games_source_idx on public.games (source);
create index if not exists games_import_key_idx on public.games (import_key);
create index if not exists games_rating_idx on public.games (rating desc);
create index if not exists games_release_date_idx on public.games (release_date desc);

create table if not exists public.game_swipes (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid,
  game_id uuid not null references public.games(id) on delete cascade,
  action text not null check (action in ('liked', 'disliked', 'skipped', 'saved', 'played')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (session_id, game_id)
);

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.game_swipes'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%action%liked%';

  if constraint_name is not null then
    execute format('alter table public.game_swipes drop constraint %I', constraint_name);
  end if;

  alter table public.game_swipes
    add constraint game_swipes_action_check
    check (action in ('liked', 'disliked', 'skipped', 'saved', 'played'));
end $$;

create index if not exists game_swipes_session_idx on public.game_swipes(session_id);
create index if not exists game_swipes_game_idx on public.game_swipes(game_id);

alter table public.games enable row level security;
alter table public.game_swipes enable row level security;

drop policy if exists "Games are readable by everyone" on public.games;
create policy "Games are readable by everyone"
on public.games
for select
using (true);

drop policy if exists "Game swipes are readable by everyone" on public.game_swipes;
create policy "Game swipes are readable by everyone"
on public.game_swipes
for select
using (true);
