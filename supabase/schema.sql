-- Kifaya Ops production database
-- Run this entire file in Supabase SQL Editor.
-- Security model: every business row belongs to auth.uid(); RLS blocks cross-user access.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  email text,
  phone text,
  segment text,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null check (char_length(reference) between 1 and 40),
  client_name text,
  product text not null check (char_length(product) between 1 and 180),
  channel text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'TND' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','preparing','in_progress','delivered','cancelled')),
  notes text check (notes is null or char_length(notes) <= 2000),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.orders enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "clients_owner_all" on public.clients;
create policy "clients_owner_all" on public.clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "orders_owner_all" on public.orders;
create policy "orders_owner_all" on public.orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Prevent the browser role from touching these tables without RLS.
revoke all on public.profiles from anon;
revoke all on public.clients from anon;
revoke all on public.orders from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
