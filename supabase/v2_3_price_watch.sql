-- GameLog v2.3 Price Watch optional tables
-- Local Price Watch works without this. Run this when you want cloud price history later.

create table if not exists public.game_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  game_title text not null,
  source text not null default 'Steam',
  source_app_id text,
  store_url text,
  current_price numeric,
  original_price numeric,
  discount_percent integer default 0,
  currency text default 'USD',
  region text default 'US',
  checked_at timestamptz not null default now()
);

create table if not exists public.price_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  game_id uuid references public.games(id) on delete cascade not null,
  target_price numeric,
  created_at timestamptz not null default now(),
  unique(user_id, game_id)
);

alter table public.game_price_snapshots enable row level security;
alter table public.price_watchlist enable row level security;

create policy if not exists "read own price snapshots" on public.game_price_snapshots
  for select using (auth.uid() = user_id or user_id is null);

create policy if not exists "insert own price snapshots" on public.game_price_snapshots
  for insert with check (auth.uid() = user_id or user_id is null);

create policy if not exists "manage own price watchlist" on public.price_watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists game_price_snapshots_game_checked_idx on public.game_price_snapshots(game_id, checked_at desc);
create index if not exists price_watchlist_user_idx on public.price_watchlist(user_id);
