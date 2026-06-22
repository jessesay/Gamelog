-- GameLog v3.2 optional completion-time fields
-- Run this when you want real cloud-backed completion estimates instead of only GameLog's local estimates.

alter table public.games
  add column if not exists time_to_beat_main_hours numeric,
  add column if not exists time_to_beat_extra_hours numeric,
  add column if not exists time_to_beat_completionist_hours numeric,
  add column if not exists time_to_beat_source text;

comment on column public.games.time_to_beat_main_hours is 'Estimated main-story/main-path time in hours.';
comment on column public.games.time_to_beat_extra_hours is 'Estimated main plus extras time in hours.';
comment on column public.games.time_to_beat_completionist_hours is 'Estimated completionist time in hours.';
comment on column public.games.time_to_beat_source is 'Where the estimate came from, such as GameLog estimate, manual, or future provider.';
