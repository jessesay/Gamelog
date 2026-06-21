-- GameLog v1.12 beta feedback board
-- Optional: run this in Supabase SQL Editor to let signed-in testers submit feedback from the Beta page.

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('Bug', 'Missing game', 'Duplicate game', 'Feature idea', 'UI polish', 'Other')),
  body text not null,
  target text,
  contact text,
  page text,
  app_version text,
  status text not null default 'new' check (status in ('new', 'triaged', 'fixed', 'wont_fix')),
  created_at timestamptz not null default now()
);

alter table public.beta_feedback enable row level security;

drop policy if exists "testers can send feedback" on public.beta_feedback;
create policy "testers can send feedback" on public.beta_feedback
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can read own feedback" on public.beta_feedback;
create policy "users can read own feedback" on public.beta_feedback
  for select to authenticated
  using (auth.uid() = user_id);
