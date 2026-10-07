-- Run once in Supabase > SQL Editor
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text, tagline text, brokerage text, phone text, contact_email text, website text,
  licence text, gvr_member boolean default false,
  logo text, photo text,              -- small images stored as data URLs
  slug text unique,
  plan text, status text default 'none', period_end timestamptz,
  stripe_customer_id text,
  created_at timestamptz default now()
);
create table if not exists reports (
  key text primary key,               -- e.g. 2026-09
  month text not null,                -- e.g. September 2026
  data jsonb not null,
  published_at timestamptz default now()
);
-- All access goes through the site's server functions (service key), so lock the tables down.
alter table profiles enable row level security;
alter table reports enable row level security;
