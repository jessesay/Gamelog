-- GameLog Game Status System v1.
-- Safe to run repeatedly. Existing saves remain intact and normalize to want_to_play.
alter table public.game_logs add column if not exists library_status text;
alter table public.game_logs add column if not exists personal_rating numeric(3,1);
alter table public.game_logs add column if not exists personal_notes text;
alter table public.game_logs add column if not exists hours_played numeric(8,1);

update public.game_logs
set library_status = case
  when status = 'Currently Playing' then 'playing'
  when status in ('Completed', '100% Completed') then 'completed'
  when status = 'Dropped' then 'dropped'
  when status = 'Want to Play' then 'wishlist'
  else 'want_to_play'
end
where library_status is null;

alter table public.game_logs alter column library_status set default 'want_to_play';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'game_logs_library_status_check') then
    alter table public.game_logs add constraint game_logs_library_status_check check (library_status in ('want_to_play','playing','paused','completed','dropped','wishlist')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'game_logs_personal_rating_check') then
    alter table public.game_logs add constraint game_logs_personal_rating_check check (personal_rating is null or (personal_rating >= 1 and personal_rating <= 10)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'game_logs_hours_played_check') then
    alter table public.game_logs add constraint game_logs_hours_played_check check (hours_played is null or hours_played >= 0) not valid;
  end if;
end $$;
