-- ════════════════════════════════════════════════
-- MogRank — Supabase Schema
-- Run this in the Supabase SQL editor
-- ════════════════════════════════════════════════

-- 1. profiles (extends auth.users)
create table if not exists public.profiles (
  id               uuid primary key references auth.users on delete cascade,
  email            text,
  created_at       timestamptz default now(),
  plan                text not null default 'free',   -- free | once | monthly
  analyses_limit      int  not null default 1,
  analyses_used       int  not null default 0,
  analyses_remaining  int  not null default 0       -- decremented on each paid results view
);
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. analyses
create table if not exists public.analyses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles on delete set null,
  session_id  text unique,          -- mogrank_analysis_id from sessionStorage
  photo_url   text,
  score       float,
  results     jsonb,
  created_at  timestamptz default now()
);
alter table public.analyses enable row level security;

create policy "Users can read own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

-- 3. purchases
create table if not exists public.purchases (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references public.profiles on delete set null,
  stripe_session_id  text unique not null,
  analysis_id        text,           -- links payment to specific analysis
  plan               text not null,  -- once | monthly
  amount             int  default 0, -- cents
  used               boolean not null default false, -- true once the paid results have been viewed
  created_at         timestamptz default now()
);
-- Migration for existing deployments:
-- ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS used boolean not null default false;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS analyses_remaining int not null default 0;
alter table public.purchases enable row level security;

create policy "Users can read own purchases"
  on public.purchases for select
  using (auth.uid() = user_id);

-- Service role can insert (webhook)
create policy "Service role can insert purchases"
  on public.purchases for insert
  with check (true);

create policy "Service role can update purchases"
  on public.purchases for update
  using (true);

-- 4. battles (for MogRank Live)
create table if not exists public.battles (
  id          uuid primary key default gen_random_uuid(),
  user1_id    uuid references public.profiles on delete set null,
  user2_id    uuid references public.profiles on delete set null,
  winner_id   uuid references public.profiles on delete set null,
  created_at  timestamptz default now()
);
alter table public.battles enable row level security;

create policy "Users can read battles they participated in"
  on public.battles for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);
