-- GameLog v1.9 catalog engine metadata helpers.
-- Optional but recommended. Run this after schema.sql if you want explicit source fields.

alter table public.games add column if not exists igdb_id bigint;
alter table public.games add column if not exists source text;
alter table public.games add column if not exists source_url text;

create unique index if not exists games_igdb_id_unique on public.games (igdb_id) where igdb_id is not null;
create index if not exists games_source_idx on public.games (source);

-- Backfill a few obvious source labels from existing slugs/summaries.
update public.games set source = 'IGDB' where source is null and slug like 'igdb-%';
update public.games set source = 'Steam' where source is null and (slug like 'steam-%' or coalesce(developer, '') ilike '%steam%');
update public.games set source = 'Archive' where source is null and coalesce(summary, '') ilike '%archive.org%';
update public.games set source = 'RAWG' where source is null and slug like 'rawg-%';
