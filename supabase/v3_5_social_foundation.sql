-- GameLog v3.5 Letterboxd-style social foundation.
-- This preserves the existing game_logs/list_items surface while adding the newer names requested for future work.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists favorite_games text[] not null default '{}';
alter table public.profiles add column if not exists favorite_platforms text[] not null default '{}';
alter table public.profiles add column if not exists favorite_genres text[] not null default '{}';
alter table public.game_lists add column if not exists is_public boolean not null default true;

create table if not exists public.game_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  rating numeric(2,1) check (rating is null or (rating >= 1 and rating <= 5)),
  body text,
  is_spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create table if not exists public.game_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.game_lists(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  position int,
  note text,
  created_at timestamptz not null default now(),
  unique (list_id, game_id)
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  review_id uuid references public.game_reviews(id) on delete cascade,
  list_id uuid references public.game_lists(id) on delete cascade,
  event_type text not null check (event_type in ('played', 'wishlisted', 'rated', 'reviewed', 'listed', 'followed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_reviews_user_created_idx on public.game_reviews (user_id, created_at desc);
create index if not exists game_reviews_game_created_idx on public.game_reviews (game_id, created_at desc);
create index if not exists game_ratings_game_idx on public.game_ratings (game_id);
create index if not exists game_list_items_list_position_idx on public.game_list_items (list_id, position nulls last, created_at);
create index if not exists activity_events_created_idx on public.activity_events (created_at desc);
create index if not exists activity_events_user_idx on public.activity_events (user_id, created_at desc);

-- Older app versions could create more than one log/review for the same user and game.
-- Keep the newest record before enforcing the one-row-per-user/game contract used by the UI.
delete from public.game_logs older
using public.game_logs newer
where older.user_id = newer.user_id
  and older.game_id = newer.game_id
  and (older.updated_at, older.created_at, older.id) < (newer.updated_at, newer.created_at, newer.id);

delete from public.game_reviews older
using public.game_reviews newer
where older.user_id = newer.user_id
  and older.game_id = newer.game_id
  and (older.updated_at, older.created_at, older.id) < (newer.updated_at, newer.created_at, newer.id);

create unique index if not exists game_logs_user_game_unique_idx on public.game_logs (user_id, game_id);
create unique index if not exists game_reviews_user_game_unique_idx on public.game_reviews (user_id, game_id);

update public.activity_events event
set review_id = review.id
from public.game_reviews review
where event.review_id is null
  and event.event_type = 'reviewed'
  and event.user_id = review.user_id
  and event.game_id = review.game_id;

drop trigger if exists set_game_reviews_updated_at on public.game_reviews;
create trigger set_game_reviews_updated_at
before update on public.game_reviews
for each row execute function public.set_updated_at();

drop trigger if exists set_game_ratings_updated_at on public.game_ratings;
create trigger set_game_ratings_updated_at
before update on public.game_ratings
for each row execute function public.set_updated_at();

alter table public.game_reviews enable row level security;
alter table public.game_ratings enable row level security;
alter table public.game_list_items enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists "lists are public" on public.game_lists;
drop policy if exists "lists are visible" on public.game_lists;
create policy "lists are visible" on public.game_lists for select using (is_public or auth.uid() = user_id);

drop policy if exists "list items are public" on public.list_items;
drop policy if exists "list items are visible" on public.list_items;
create policy "list items are visible" on public.list_items for select using (
  exists (
    select 1 from public.game_lists
    where game_lists.id = list_id
      and (game_lists.is_public or game_lists.user_id = auth.uid())
  )
);

drop policy if exists "game reviews are public" on public.game_reviews;
create policy "game reviews are public" on public.game_reviews for select using (true);

drop policy if exists "users can insert own game reviews" on public.game_reviews;
create policy "users can insert own game reviews" on public.game_reviews for insert with check (auth.uid() = user_id);

drop policy if exists "users can update own game reviews" on public.game_reviews;
create policy "users can update own game reviews" on public.game_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users can delete own game reviews" on public.game_reviews;
create policy "users can delete own game reviews" on public.game_reviews for delete using (auth.uid() = user_id);

drop policy if exists "game ratings are public" on public.game_ratings;
create policy "game ratings are public" on public.game_ratings for select using (true);

drop policy if exists "users can upsert own game ratings" on public.game_ratings;
create policy "users can upsert own game ratings" on public.game_ratings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "game list items are public" on public.game_list_items;
create policy "game list items are public" on public.game_list_items for select using (true);

drop policy if exists "list owners can manage game list items" on public.game_list_items;
create policy "list owners can manage game list items" on public.game_list_items for all using (
  exists (select 1 from public.game_lists where game_lists.id = list_id and game_lists.user_id = auth.uid())
) with check (
  exists (select 1 from public.game_lists where game_lists.id = list_id and game_lists.user_id = auth.uid())
);

drop policy if exists "activity events are public" on public.activity_events;
create policy "activity events are public" on public.activity_events for select using (true);

drop policy if exists "users can insert own activity events" on public.activity_events;
create policy "users can insert own activity events" on public.activity_events for insert with check (auth.uid() = user_id);
