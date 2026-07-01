-- GameLog Beta Feedback v1
-- Safe to rerun. Submissions go through the server endpoint; feedback remains
-- private to the service role and the submitting signed-in user.

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  feedback_type text not null default 'other' check (feedback_type in ('bug', 'idea', 'confusion', 'praise', 'other')),
  body text not null,
  contact text,
  page text,
  session_id text,
  user_agent text,
  device text,
  target text,
  app_version text,
  status text not null default 'new' check (status in ('new', 'triaged', 'fixed', 'wont_fix')),
  created_at timestamptz not null default now()
);

alter table public.beta_feedback add column if not exists feedback_type text not null default 'other';
alter table public.beta_feedback add column if not exists session_id text;
alter table public.beta_feedback add column if not exists user_agent text;
alter table public.beta_feedback add column if not exists device text;
alter table public.beta_feedback enable row level security;

drop policy if exists "Feedback is readable during beta" on public.beta_feedback;
drop policy if exists "Anyone can submit beta feedback" on public.beta_feedback;
drop policy if exists "testers can send feedback" on public.beta_feedback;
drop policy if exists "users can read own feedback" on public.beta_feedback;

create policy "users can read own feedback" on public.beta_feedback
  for select to authenticated using (auth.uid() = user_id);

create index if not exists beta_feedback_created_idx on public.beta_feedback(created_at desc);
create index if not exists beta_feedback_status_idx on public.beta_feedback(status, created_at desc);
