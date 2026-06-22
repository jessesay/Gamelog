create index if not exists game_swipes_action_idx on public.game_swipes(action);
notify pgrst, 'reload schema';
