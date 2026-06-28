-- GameLog v3.11: import run history, retryable errors, and catalog health metrics.

create table if not exists public.catalog_import_runs (
  id uuid primary key default gen_random_uuid(),
  importer text not null,
  sources text[] not null default '{}',
  status text not null check (status in ('running', 'completed', 'failed')),
  dry_run boolean not null default false,
  stats jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.catalog_import_errors (
  id bigint generated always as identity primary key,
  run_id uuid references public.catalog_import_runs(id) on delete set null,
  source text not null,
  source_id text,
  title text,
  error_message text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'failed' check (status in ('failed', 'retrying', 'resolved', 'ignored')),
  retry_count integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_retry_at timestamptz,
  resolved_at timestamptz
);

create index if not exists catalog_import_runs_started_idx on public.catalog_import_runs (started_at desc);
create index if not exists catalog_import_errors_status_idx on public.catalog_import_errors (status, first_seen_at desc);
create index if not exists catalog_import_errors_run_idx on public.catalog_import_errors (run_id);

alter table public.catalog_import_runs enable row level security;
alter table public.catalog_import_errors enable row level security;

create or replace function public.catalog_health_summary()
returns table (
  total_games bigint,
  discovery_ready bigint,
  missing_box_art bigint,
  missing_genres bigint,
  missing_platforms bigint,
  missing_release_year bigint
)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (
      where nullif(trim(cover_url), '') is not null
        and (
          (nullif(trim(genre), '') is not null and lower(trim(genre)) not in ('game', 'unknown', 'n/a', 'other'))
          or exists (select 1 from unnest(coalesce(genres, '{}'::text[])) value where lower(trim(value)) not in ('game', 'unknown', 'n/a', 'other'))
        )
        and exists (select 1 from unnest(coalesce(platforms, '{}'::text[])) value where lower(trim(value)) not in ('game', 'unknown', 'n/a', 'other'))
        and (release_year is not null or release_date is not null)
    )::bigint,
    count(*) filter (where nullif(trim(cover_url), '') is null)::bigint,
    count(*) filter (where
      (nullif(trim(genre), '') is null or lower(trim(genre)) in ('game', 'unknown', 'n/a', 'other'))
      and not exists (select 1 from unnest(coalesce(genres, '{}'::text[])) value where lower(trim(value)) not in ('game', 'unknown', 'n/a', 'other'))
    )::bigint,
    count(*) filter (where not exists (select 1 from unnest(coalesce(platforms, '{}'::text[])) value where lower(trim(value)) not in ('game', 'unknown', 'n/a', 'other')))::bigint,
    count(*) filter (where release_year is null and release_date is null)::bigint
  from public.games;
$$;

revoke all on table public.catalog_import_runs from anon, authenticated;
revoke all on table public.catalog_import_errors from anon, authenticated;
revoke all on function public.catalog_health_summary() from public, anon, authenticated;
grant execute on function public.catalog_health_summary() to service_role;
