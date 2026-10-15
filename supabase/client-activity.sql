-- Run this once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.
-- October 2026: past months and Client activity.
-- A personal link can open on one month (e.g. the month the client bought their home).
alter table personal_links add column if not exists month text;
-- One row per report open: reading time, time per section, read to the end, taps. link_id is empty for the general link.
create table if not exists visits (
  id text primary key,                -- made by the page, e.g. 3fK9xQ2mPa7L
  user_id uuid not null references profiles(id) on delete cascade,
  link_id text references personal_links(id) on delete set null,
  month text,                         -- the month they opened, e.g. 2026-09
  device text,                        -- phone or computer
  seconds int default 0,              -- reading time
  reached_end boolean default false,
  parts jsonb default '{}'::jsonb,    -- seconds per section, e.g. {"hoods": 540}
  acts jsonb default '[]'::jsonb,     -- taps, e.g. ["contact", "type:c", "month:2021-03"]
  started_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists visits_user_time on visits (user_id, started_at desc);
create index if not exists visits_link_time on visits (link_id, started_at desc);
alter table visits enable row level security;
