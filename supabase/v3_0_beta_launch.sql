-- GameLog v3.0 beta launch system
-- Optional cloud tables for waitlist, onboarding progress, and feedback voting.

create table if not exists public.beta_waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null,
  platform text,
  gamer_type text,
  notes text,
  status text not null default 'new'
);

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null default 'Bug / polish',
  title text not null,
  details text,
  priority text not null default 'Medium',
  status text not null default 'New',
  votes integer not null default 1
);

create table if not exists public.beta_onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade,
  completed_steps text[] not null default '{}',
  unique(user_id)
);

alter table public.beta_waitlist enable row level security;
alter table public.beta_feedback enable row level security;
alter table public.beta_onboarding_progress enable row level security;

create policy if not exists "Anyone can join beta waitlist" on public.beta_waitlist
  for insert with check (true);

create policy if not exists "Anyone can submit beta feedback" on public.beta_feedback
  for insert with check (true);

create policy if not exists "Feedback is readable during beta" on public.beta_feedback
  for select using (true);

create policy if not exists "Users can read own onboarding" on public.beta_onboarding_progress
  for select using (auth.uid() = user_id);

create policy if not exists "Users can insert own onboarding" on public.beta_onboarding_progress
  for insert with check (auth.uid() = user_id);

create policy if not exists "Users can update own onboarding" on public.beta_onboarding_progress
  for update using (auth.uid() = user_id);
