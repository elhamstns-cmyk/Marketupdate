-- Run once in Supabase > SQL Editor. Adds the table for "Ask about my neighbourhood" (S5) and the Clients page (P10).
-- S5 Ask about my neighbourhood and P10 Clients (October 2026): clients who asked an agent about their neighbourhood.
create table if not exists hood_requests (
  id text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null, email text not null, city text not null, hood text not null,
  mode text default 'tell',            -- 'send' = their link was sent for the agent, 'tell' = the agent was told
  status text default 'new',           -- 'new', 'sent' or 'done'
  link_id text references personal_links(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists hood_requests_user on hood_requests (user_id, created_at desc);
alter table hood_requests enable row level security;
