create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text not null,
  title text not null,
  slug text,
  description text,
  cover_url text,
  background_url text,
  platforms text[] default '{}',
  genres text[] default '{}',
  tags text[] default '{}',
  release_date date,
  rating numeric,
  metacritic integer,
  stores jsonb default '[]',
  raw jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (source, source_id)
);

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

create index if not exists games_source_idx on public.games(source);
create index if not exists games_rating_idx on public.games(rating desc);
create index if not exists games_release_date_idx on public.games(release_date desc);
create index if not exists game_swipes_session_idx on public.game_swipes(session_id);
create index if not exists game_swipes_game_idx on public.game_swipes(game_id);

alter table public.games enable row level security;
alter table public.game_swipes enable row level security;

drop policy if exists "Games are readable by everyone" on public.games;

create policy "Games are readable by everyone"
on public.games
for select
using (true);
