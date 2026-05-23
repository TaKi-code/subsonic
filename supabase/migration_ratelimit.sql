-- SUBSONIC — phase A1: per-IP rate limiting for the AI interpret endpoint
-- Run once in Supabase SQL Editor (additive — won't affect existing user_data).
--
-- The table is intentionally open to anonymous read/write because rate-limit
-- counters aren't secret. The row key is the client IP and stale rows expire
-- when the 24h window rolls over (handled in app code).

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
