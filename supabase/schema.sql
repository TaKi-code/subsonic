-- SUBSONIC — cloud sync schema
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
--
-- One key-value row per user per data key (e.g. the imported library, the saved
-- sets). Row-level security ensures each user can only ever read/write their own
-- rows, even though the anon key is public in the browser.

create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null,
  value      jsonb       not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

-- Each policy restricts the row set to the calling user (auth.uid()).
drop policy if exists "read own data"   on public.user_data;
drop policy if exists "insert own data" on public.user_data;
drop policy if exists "update own data" on public.user_data;
drop policy if exists "delete own data" on public.user_data;

create policy "read own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "update own data"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own data"
  on public.user_data for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- AI rate-limit counters (per-IP daily window). See migration_ratelimit.sql
-- for the standalone migration version of this block.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_rate_limits (
  ip           text         primary key,
  window_start timestamptz  not null default now(),
  count        integer      not null default 0
);

alter table public.ai_rate_limits enable row level security;

drop policy if exists "anon rate-limit access" on public.ai_rate_limits;

create policy "anon rate-limit access"
  on public.ai_rate_limits
  for all
  using (true)
  with check (true);
