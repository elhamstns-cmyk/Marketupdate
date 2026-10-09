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

-- Campaign list: everyone who starts sign-up on the landing page
create table if not exists leads (
  email text primary key,
  role text default 'realtor',
  consent boolean default false,     -- ticked "email me tips and offers"
  consent_text text,
  consent_at timestamptz,
  created_at timestamptz default now()
);
alter table leads add column if not exists consent boolean default false;
alter table leads add column if not exists consent_at timestamptz;
alter table leads enable row level security;

-- Report look (Pro) and whether the subscriber is a REALTOR or a mortgage broker
alter table profiles add column if not exists theme jsonb;
alter table profiles add column if not exists role text default 'realtor';

-- October 2026: what to show on the report (Pro), and the history of everything an agent creates
alter table profiles add column if not exists show jsonb;
create table if not exists exports (
  id text primary key,                -- short id used in the link, e.g. /r/jane-smith?v=Ab3dE9xY
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,                 -- link, email, pdf, post, story, caption
  area text not null,
  month_key text, month text,         -- which month's numbers
  settings jsonb,                     -- look and what to show, when it was made
  created_at timestamptz default now()
);
create index if not exists exports_user_time on exports (user_id, created_at desc);
alter table exports enable row level security;

-- Email confirmed by clicking our link (Google sign-ins count as confirmed)
alter table profiles add column if not exists email_verified boolean default false;
