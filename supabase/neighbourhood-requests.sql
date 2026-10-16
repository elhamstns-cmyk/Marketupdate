-- Run once in Supabase > SQL Editor. Adds the table for "Ask about my neighbourhood" (S5) and the Clients page (P10). Safe to run again.
-- S5 Ask about my neighbourhood and P10 Clients (October 2026): people who asked an agent about a neighbourhood.
create table if not exists hood_requests (
  id text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  name text,                           -- the personal link's name (e.g. the Chen family); empty for someone on the general link
  contact text,                        -- email or phone, left by someone on the general link
  city text not null, hood text not null,
  mode text default 'tell',            -- 'show' = it opened for them right away, 'tell' = the agent was told
  status text default 'new',           -- 'new', 'sent' or 'done'
  link_id text references personal_links(id) on delete set null,   -- the link made for them ('show')
  from_link text references personal_links(id) on delete set null, -- the personal link they asked from
  created_at timestamptz default now()
);
-- If an earlier version of this table was already made: bring it up to date (safe to run again).
alter table hood_requests add column if not exists contact text;
alter table hood_requests add column if not exists from_link text references personal_links(id) on delete set null;
alter table hood_requests alter column name drop not null;
do $$ begin if exists (select 1 from information_schema.columns where table_name = 'hood_requests' and column_name = 'email') then
  alter table hood_requests alter column email drop not null; end if; end $$;
create index if not exists hood_requests_user on hood_requests (user_id, created_at desc);
alter table hood_requests enable row level security;
