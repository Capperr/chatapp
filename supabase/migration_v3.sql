-- Migration v3: Taxi driver accounting module
-- Run this in the Supabase SQL Editor

-- Accounting shifts table (one row per shift/vagt)
create table if not exists public.accounting_shifts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  shift_date date not null,
  vagt_nummer text not null default '',
  konto numeric(10,2) not null default 0,
  kreditkort numeric(10,2) not null default 0,
  diverse numeric(10,2) not null default 0,
  drikkepenge numeric(10,2) not null default 0,
  kontant numeric(10,2) not null default 0,
  total_indkoert numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Per-user tax settings
create table if not exists public.tax_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  loenstype text not null default 'loenmodtager', -- 'loenmodtager' or 'provisions'
  skatteprocent numeric(5,2) not null default 37.0,
  provision_sats numeric(5,2) not null default 50.0,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.accounting_shifts enable row level security;
alter table public.tax_settings enable row level security;

-- RLS policies
drop policy if exists "Users can manage own shifts" on public.accounting_shifts;
create policy "Users can manage own shifts"
  on public.accounting_shifts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own tax settings" on public.tax_settings;
create policy "Users can manage own tax settings"
  on public.tax_settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
