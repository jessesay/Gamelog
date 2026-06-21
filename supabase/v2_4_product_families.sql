-- GameLog v2.4 optional product family fields
-- Run this only when you want to store DLC/add-on relationships in Supabase.
-- The app also groups many add-ons automatically by title, so this is optional.

alter table public.games
  add column if not exists product_type text default 'game',
  add column if not exists parent_game_id uuid references public.games(id) on delete set null;

create index if not exists games_parent_game_id_idx on public.games(parent_game_id);
create index if not exists games_product_type_idx on public.games(product_type);
