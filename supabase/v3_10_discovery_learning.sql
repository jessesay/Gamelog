-- GameLog v3.10: lightweight discovery analytics and preference learning.

create table if not exists public.discovery_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  favorite_platforms text[] not null default '{}',
  favorite_genres text[] not null default '{}',
  favorite_games text[] not null default '{}',
  discovery_styles text[] not null default '{}',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discovery_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id text,
  game_id uuid references public.games(id) on delete cascade,
  event_name text not null check (event_name in ('save', 'skip', 'played', 'want_to_play', 'card_viewed', 'signin_prompt_clicked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists discovery_events_user_created_idx on public.discovery_events (user_id, created_at desc);
create index if not exists discovery_events_user_game_idx on public.discovery_events (user_id, game_id);
create index if not exists game_swipes_user_updated_idx on public.game_swipes (user_id, updated_at desc);

alter table public.discovery_preferences enable row level security;
alter table public.discovery_events enable row level security;

drop policy if exists "users can read own discovery preferences" on public.discovery_preferences;
create policy "users can read own discovery preferences" on public.discovery_preferences for select using (auth.uid() = user_id);
drop policy if exists "users can insert own discovery preferences" on public.discovery_preferences;
create policy "users can insert own discovery preferences" on public.discovery_preferences for insert with check (auth.uid() = user_id);
drop policy if exists "users can update own discovery preferences" on public.discovery_preferences;
create policy "users can update own discovery preferences" on public.discovery_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users can read own discovery events" on public.discovery_events;
create policy "users can read own discovery events" on public.discovery_events for select using (auth.uid() = user_id);
drop policy if exists "users can insert own discovery events" on public.discovery_events;
create policy "users can insert own discovery events" on public.discovery_events for insert with check (auth.uid() = user_id);
