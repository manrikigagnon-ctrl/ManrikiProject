-- ============================================================
-- MANRIKI DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- Messages: the full conversation history with the AI coach
create table messages (
  id uuid default gen_random_uuid() primary key,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now() not null
);

-- Commitments: what the user commits to doing
create table commitments (
  id uuid default gen_random_uuid() primary key,
  description text not null,
  deadline timestamptz not null,
  status text default 'active' check (status in ('active', 'done', 'missed', 'rescheduled')),
  times_rescheduled int default 0,
  created_at timestamptz default now() not null,
  completed_at timestamptz,
  missed_reason text
);

-- Check-ins: what happened at each deadline
create table check_ins (
  id uuid default gen_random_uuid() primary key,
  commitment_id uuid references commitments(id) on delete cascade,
  outcome text not null check (outcome in ('done', 'missed', 'rescheduled', 'partial')),
  reason text,
  ai_category text check (ai_category in (
    'legitimate_blocker',
    'fear_based_avoidance',
    'low_energy',
    'overcommitment',
    'vague_deflection',
    'no_reason_given'
  )),
  created_at timestamptz default now() not null
);

-- Patterns: AI-detected behavioral patterns
create table patterns (
  id uuid default gen_random_uuid() primary key,
  pattern_type text not null,
  description text not null,
  evidence text not null,
  times_observed int default 1,
  first_seen timestamptz default now() not null,
  last_seen timestamptz default now() not null
);

-- Enable Row Level Security (required by Supabase)
-- For Phase 1 (solo use), we allow all operations
-- Phase 3 will add proper user-based RLS policies
alter table messages enable row level security;
alter table commitments enable row level security;
alter table check_ins enable row level security;
alter table patterns enable row level security;

-- Permissive policies for Phase 1 (solo user)
create policy "Allow all on messages" on messages for all using (true) with check (true);
create policy "Allow all on commitments" on commitments for all using (true) with check (true);
create policy "Allow all on check_ins" on check_ins for all using (true) with check (true);
create policy "Allow all on patterns" on patterns for all using (true) with check (true);

-- Indexes for common queries
create index idx_messages_created on messages(created_at desc);
create index idx_commitments_status on commitments(status, deadline);
create index idx_check_ins_commitment on check_ins(commitment_id);
create index idx_patterns_type on patterns(pattern_type);
