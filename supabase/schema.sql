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

-- Licence check: V number (REALTOR®) or BCFSA number (mortgage broker), confirmed by the agent, verified by admin
alter table profiles add column if not exists licence_status text default 'pending';
alter table profiles add column if not exists licence_confirmed_at timestamptz;

-- Instagram connection (Pro). Only the server (service key) can read it: tokens never reach the browser.
create table if not exists instagram (
  user_id uuid primary key references profiles(id) on delete cascade,
  ig_user_id text not null,
  username text,
  token text not null,
  expires_at timestamptz,
  refreshed_at timestamptz,
  auto boolean default false,
  story boolean default false,
  area text default 'Greater Vancouver',
  last_month text,
  last_posted_at timestamptz,
  created_at timestamptz default now()
);
alter table instagram enable row level security;
-- Public image bucket Instagram fetches the post and story from.
insert into storage.buckets (id, name, public) values ('social', 'social', true) on conflict (id) do nothing;

-- October 2026: personal links (a client's own link with their name and neighbourhood) and what clients looked at
create table if not exists personal_links (
  id text primary key,                -- short id used in the link, e.g. /r/jane-smith?p=Ab3dE9xY
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,                 -- e.g. the Chen family
  city text not null, hood text not null, type text default 'd',
  opens int default 0, last_opened_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists personal_links_user on personal_links (user_id, created_at desc);
alter table personal_links enable row level security;
create table if not exists hood_views (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  link_id text references personal_links(id) on delete set null,   -- empty for the general link (anonymous)
  city text, hood text, kind text,    -- kind: pick (chose their area), peek (looked at another), compare
  created_at timestamptz default now()
);
create index if not exists hood_views_user_time on hood_views (user_id, created_at desc);
alter table hood_views enable row level security;
alter table profiles add column if not exists weekly_email boolean default true;
