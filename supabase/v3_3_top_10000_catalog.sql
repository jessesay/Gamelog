-- GameLog v3.3 Top 10,000 Catalog Import support
-- Run this before using import-top-10000.bat or pnpm catalog:igdb-top.

alter table public.games add column if not exists igdb_id bigint;
alter table public.games add column if not exists source text;
alter table public.games add column if not exists source_url text;
alter table public.games add column if not exists product_type text;
alter table public.games add column if not exists parent_game_id uuid references public.games(id) on delete set null;
alter table public.games add column if not exists time_to_beat_main_hours numeric;
alter table public.games add column if not exists time_to_beat_extra_hours numeric;
alter table public.games add column if not exists time_to_beat_completionist_hours numeric;
alter table public.games add column if not exists time_to_beat_source text;
alter table public.games add column if not exists catalog_rank int;
alter table public.games add column if not exists catalog_score numeric;
alter table public.games add column if not exists igdb_total_rating numeric;
alter table public.games add column if not exists igdb_total_rating_count int;
alter table public.games add column if not exists igdb_hypes int;
alter table public.games add column if not exists igdb_follows int;
alter table public.games add column if not exists catalog_imported_at timestamptz;

create unique index if not exists games_igdb_id_unique on public.games (igdb_id) where igdb_id is not null;
create index if not exists games_catalog_rank_idx on public.games (catalog_rank) where catalog_rank is not null;
create index if not exists games_catalog_score_idx on public.games (catalog_score desc) where catalog_score is not null;
create index if not exists games_source_idx on public.games (source);
create index if not exists games_product_parent_idx on public.games (parent_game_id) where parent_game_id is not null;

comment on column public.games.catalog_rank is 'GameLog top catalog rank from the bulk IGDB catalog importer.';
comment on column public.games.catalog_score is 'GameLog internal catalog score using IGDB rating count, score, hypes, and follows.';
comment on column public.games.catalog_imported_at is 'Timestamp for the most recent bulk catalog import/update.';
comment on column public.games.igdb_total_rating_count is 'IGDB total rating count at import time.';
comment on column public.games.igdb_hypes is 'IGDB hype count at import time.';
comment on column public.games.igdb_follows is 'IGDB follow count at import time.';
