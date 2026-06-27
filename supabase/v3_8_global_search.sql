-- GameLog v3.8 global catalog search.
-- Run once in the Supabase SQL editor. The app has a scalar-field fallback while
-- this migration is rolling out, but this function adds array and JSON metadata.

create extension if not exists pg_trgm;

create index if not exists games_title_trgm_idx
  on public.games using gin (title gin_trgm_ops);
create index if not exists games_slug_trgm_idx
  on public.games using gin (slug gin_trgm_ops);

create or replace function public.search_games_global(search_query text, result_limit int default 40)
returns setof public.games
language sql
stable
security invoker
set search_path = public
as $$
  select games.*
  from public.games
  where nullif(btrim(search_query), '') is not null
    and concat_ws(' ',
      games.title,
      games.slug,
      games.developer,
      games.publisher,
      games.genre,
      array_to_string(games.genres, ' '),
      array_to_string(games.platforms, ' '),
      array_to_string(games.tags, ' '),
      games.source,
      games.source_id,
      games.import_key,
      games.source_url,
      games.stores::text,
      games.raw::text
    ) ilike '%' || search_query || '%'
  order by
    case when lower(games.title) = lower(search_query) then 0
         when games.title ilike search_query || '%' then 1
         else 2 end,
    similarity(games.title, search_query) desc,
    games.rating desc nulls last,
    games.title
  limit least(greatest(result_limit, 1), 80);
$$;

grant execute on function public.search_games_global(text, int) to anon, authenticated;
