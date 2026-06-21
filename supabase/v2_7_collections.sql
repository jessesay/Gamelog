-- GameLog v2.7 optional Collections layer
-- The current app stores saved collection pins locally and publishes collections as existing public lists.
-- Run this only when you want cloud-synced saved collection pins later.

create table if not exists public.saved_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_key text not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique (user_id, collection_key)
);

alter table public.saved_collections enable row level security;

drop policy if exists "Users can read their saved collections" on public.saved_collections;
create policy "Users can read their saved collections"
  on public.saved_collections for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their saved collections" on public.saved_collections;
create policy "Users can insert their saved collections"
  on public.saved_collections for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their saved collections" on public.saved_collections;
create policy "Users can delete their saved collections"
  on public.saved_collections for delete
  using (auth.uid() = user_id);
