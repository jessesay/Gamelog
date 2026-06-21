-- GameLog Supabase schema
-- Run this in Supabase SQL Editor before using the app.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default 'New Player',
  bio text default '',
  favorite_game text default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  developer text,
  publisher text,
  release_year int,
  genre text,
  platforms text[] default '{}',
  cover_url text,
  summary text,
  created_by uuid references public.profiles(id) on delete set null,
  is_community boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  status text not null check (status in ('Want to Play', 'Backlog', 'Currently Playing', 'Completed', '100% Completed', 'Dropped', 'Replaying')),
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5 and rating * 2 = floor(rating * 2))),
  review text,
  vibe text,
  played_on date,
  is_spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  is_ranked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.game_lists(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  position int,
  note text,
  created_at timestamptz not null default now(),
  unique(list_id, game_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.review_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_id uuid not null references public.game_logs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, log_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_id uuid not null references public.game_logs(id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_title_idx on public.games using gin (to_tsvector('english', title || ' ' || coalesce(genre, '') || ' ' || coalesce(summary, '')));
create index if not exists game_logs_user_created_idx on public.game_logs (user_id, created_at desc);
create index if not exists game_logs_game_created_idx on public.game_logs (game_id, created_at desc);
create index if not exists game_lists_user_created_idx on public.game_lists (user_id, created_at desc);
create index if not exists list_items_list_position_idx on public.list_items (list_id, position nulls last, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_games_updated_at on public.games;
create trigger set_games_updated_at
before update on public.games
for each row execute function public.set_updated_at();

drop trigger if exists set_game_logs_updated_at on public.game_logs;
create trigger set_game_logs_updated_at
before update on public.game_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_game_lists_updated_at on public.game_lists;
create trigger set_game_lists_updated_at
before update on public.game_lists
for each row execute function public.set_updated_at();

drop trigger if exists set_comments_updated_at on public.comments;
create trigger set_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create or replace function public.make_unique_username(base text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_base text;
  candidate text;
  suffix int := 0;
begin
  clean_base := lower(regexp_replace(coalesce(base, 'player'), '[^a-z0-9_]', '', 'g'));
  if char_length(clean_base) < 3 then
    clean_base := 'player';
  end if;
  clean_base := left(clean_base, 18);
  candidate := clean_base;

  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(clean_base, 18) || suffix::text;
  end loop;

  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    public.make_unique_username(split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'New Player'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_logs enable row level security;
alter table public.game_lists enable row level security;
alter table public.list_items enable row level security;
alter table public.follows enable row level security;
alter table public.review_likes enable row level security;
alter table public.comments enable row level security;

-- Public read policies: GameLog is social by default.
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);

drop policy if exists "games are public" on public.games;
create policy "games are public" on public.games for select using (true);

drop policy if exists "logs are public" on public.game_logs;
create policy "logs are public" on public.game_logs for select using (true);

drop policy if exists "lists are public" on public.game_lists;
create policy "lists are public" on public.game_lists for select using (true);

drop policy if exists "list items are public" on public.list_items;
create policy "list items are public" on public.list_items for select using (true);

drop policy if exists "follows are public" on public.follows;
create policy "follows are public" on public.follows for select using (true);

drop policy if exists "likes are public" on public.review_likes;
create policy "likes are public" on public.review_likes for select using (true);

drop policy if exists "comments are public" on public.comments;
create policy "comments are public" on public.comments for select using (true);

-- Owner write policies.
drop policy if exists "users can insert their profile" on public.profiles;
create policy "users can insert their profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users can update their profile" on public.profiles;
create policy "users can update their profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "authenticated users can add games" on public.games;
create policy "authenticated users can add games" on public.games for insert to authenticated with check (auth.uid() = created_by and is_community = true);

drop policy if exists "users can update own community games" on public.games;
create policy "users can update own community games" on public.games for update using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "users can delete own community games" on public.games;
create policy "users can delete own community games" on public.games for delete using (auth.uid() = created_by and is_community = true);

drop policy if exists "users can insert own logs" on public.game_logs;
create policy "users can insert own logs" on public.game_logs for insert with check (auth.uid() = user_id);

drop policy if exists "users can update own logs" on public.game_logs;
create policy "users can update own logs" on public.game_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users can delete own logs" on public.game_logs;
create policy "users can delete own logs" on public.game_logs for delete using (auth.uid() = user_id);

drop policy if exists "users can insert own lists" on public.game_lists;
create policy "users can insert own lists" on public.game_lists for insert with check (auth.uid() = user_id);

drop policy if exists "users can update own lists" on public.game_lists;
create policy "users can update own lists" on public.game_lists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users can delete own lists" on public.game_lists;
create policy "users can delete own lists" on public.game_lists for delete using (auth.uid() = user_id);

drop policy if exists "list owners can insert list items" on public.list_items;
create policy "list owners can insert list items" on public.list_items for insert with check (
  exists (select 1 from public.game_lists where game_lists.id = list_id and game_lists.user_id = auth.uid())
);

drop policy if exists "list owners can update list items" on public.list_items;
create policy "list owners can update list items" on public.list_items for update using (
  exists (select 1 from public.game_lists where game_lists.id = list_id and game_lists.user_id = auth.uid())
) with check (
  exists (select 1 from public.game_lists where game_lists.id = list_id and game_lists.user_id = auth.uid())
);

drop policy if exists "list owners can delete list items" on public.list_items;
create policy "list owners can delete list items" on public.list_items for delete using (
  exists (select 1 from public.game_lists where game_lists.id = list_id and game_lists.user_id = auth.uid())
);

drop policy if exists "users can follow others" on public.follows;
create policy "users can follow others" on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "users can unfollow" on public.follows;
create policy "users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

drop policy if exists "users can like reviews" on public.review_likes;
create policy "users can like reviews" on public.review_likes for insert with check (auth.uid() = user_id);

drop policy if exists "users can unlike reviews" on public.review_likes;
create policy "users can unlike reviews" on public.review_likes for delete using (auth.uid() = user_id);

drop policy if exists "users can comment" on public.comments;
create policy "users can comment" on public.comments for insert with check (auth.uid() = user_id);

drop policy if exists "users can update own comments" on public.comments;
create policy "users can update own comments" on public.comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users can delete own comments" on public.comments;
create policy "users can delete own comments" on public.comments for delete using (auth.uid() = user_id);
