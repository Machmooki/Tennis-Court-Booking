-- =============================================================================
-- Phase 1: Database & Security Setup
-- Tables: customers, courts, bookings, transactions
-- RLS:    Admins have full access. Anon/authenticated users get tightly
--         scoped access (active courts, and only rows linked to their own
--         customers.id).
-- RPC:    process_guest_booking() - anti-spam guarded guest booking creation.
-- =============================================================================

-- Needed for gen_random_uuid() and the GiST exclusion constraint on bookings.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- -----------------------------------------------------------------------------
-- Helper: is_admin()
-- Reads the caller's role from `app_metadata` (server-controlled, NOT the
-- user-editable `user_metadata`), so it is safe to use in RLS policies.
-- security invoker (not definer) since it only reads the caller's own JWT.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security invoker
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- =============================================================================
-- TABLES
-- =============================================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  full_name text not null,
  auth_user_id uuid references auth.users (id) on delete set null,
  credit_balance numeric(10, 2) not null default 0 check (credit_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customers is 'Guests and registered users. auth_user_id is null until a guest registers and links their account.';

create unique index customers_auth_user_id_key on public.customers (auth_user_id) where auth_user_id is not null;

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  peak_price numeric(10, 2) not null check (peak_price >= 0),
  off_peak_price numeric(10, 2) not null check (off_peak_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  court_id uuid not null references public.courts (id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  total_price numeric(10, 2) not null check (total_price >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  payment_intent_id text,
  -- Generated range used only for the overlap-prevention constraint below.
  time_range tstzrange generated always as (tstzrange(start_time, end_time, '[)')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_end_after_start check (end_time > start_time)
);

-- Database-level guarantee (survives race conditions) that a court cannot
-- have two overlapping bookings unless one of them has been cancelled.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (court_id with =, time_range with &&)
  where (status <> 'cancelled');

create index bookings_customer_id_idx on public.bookings (customer_id);
create index bookings_court_id_idx on public.bookings (court_id);
create index bookings_status_idx on public.bookings (status);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  amount numeric(10, 2) not null,
  type text not null check (type in ('payment', 'refund', 'credit_topup', 'credit_deduction')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  provider_reference text,
  created_at timestamptz not null default now()
);

create index transactions_customer_id_idx on public.transactions (customer_id);

-- Keep updated_at fresh on every row change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger courts_set_updated_at before update on public.courts
  for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.customers enable row level security;
alter table public.courts enable row level security;
alter table public.bookings enable row level security;
alter table public.transactions enable row level security;

-- --- courts -------------------------------------------------------------
create policy "Admins manage all courts"
  on public.courts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Anyone can view active courts"
  on public.courts for select
  to anon, authenticated
  using (is_active = true);

-- --- customers ------------------------------------------------------------
-- Guest customer rows are created only via the SECURITY DEFINER RPC below,
-- so there is no anon INSERT/SELECT policy here by design.
create policy "Admins manage all customers"
  on public.customers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can view their own customer record"
  on public.customers for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy "Users can update their own customer record"
  on public.customers for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- --- bookings ---------------------------------------------------------------
-- Creation always goes through a RPC (process_guest_booking, and later an
-- authenticated equivalent) so anti-spam / overlap rules can't be bypassed
-- by a direct client-side INSERT. Users may only read their own bookings and
-- cancel a still-pending one; they can never set status to 'confirmed'.
create policy "Admins manage all bookings"
  on public.bookings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can view their own bookings"
  on public.bookings for select
  to authenticated
  using (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
  );

create policy "Users can cancel their own pending bookings"
  on public.bookings for update
  to authenticated
  using (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
    and status = 'pending'
  )
  with check (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
    and status = 'cancelled'
  );

-- --- transactions -------------------------------------------------------
-- Written only by admins, trusted server code (service role, which bypasses
-- RLS), or signature-verified payment webhooks - never directly by users.
create policy "Admins manage all transactions"
  on public.transactions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can view their own transactions"
  on public.transactions for select
  to authenticated
  using (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
  );

-- =============================================================================
-- RPC: process_guest_booking
-- =============================================================================
-- SECURITY DEFINER is required so this function can insert into `customers`
-- and `bookings` on behalf of an anonymous caller despite the restrictive RLS
-- policies above. All trust-sensitive checks (anti-spam, court validity,
-- input validation) are therefore performed *inside* the function itself.
-- search_path is locked down and every reference is schema-qualified to
-- prevent search_path hijacking.
create or replace function public.process_guest_booking(
  p_phone text,
  p_full_name text,
  p_court_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_total_price numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_pending_count int;
  v_court_is_active boolean;
  v_booking_id uuid;
begin
  -- ---- Input validation ----------------------------------------------
  if p_phone is null or length(trim(p_phone)) = 0 then
    raise exception 'A valid phone number is required.';
  end if;

  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'A valid full name is required.';
  end if;

  if p_end_time <= p_start_time then
    raise exception 'Booking end time must be after the start time.';
  end if;

  if p_total_price is null or p_total_price <= 0 then
    raise exception 'Booking total price must be greater than zero.';
  end if;

  -- ---- Court validity ---------------------------------------------------
  select is_active into v_court_is_active
  from public.courts
  where id = p_court_id
  for share;

  if v_court_is_active is null then
    raise exception 'The selected court does not exist.';
  end if;

  if not v_court_is_active then
    raise exception 'The selected court is not currently available for booking.';
  end if;

  -- ---- Anti-spam: max 2 pending bookings per phone number ---------------
  select count(*) into v_pending_count
  from public.bookings b
  join public.customers c on c.id = b.customer_id
  where c.phone = p_phone
    and b.status = 'pending';

  if v_pending_count >= 2 then
    raise exception 'This phone number already has 2 pending bookings. Please complete or cancel an existing booking before creating a new one.';
  end if;

  -- ---- Insert or fetch the customer for this phone number ----------------
  insert into public.customers (phone, full_name)
  values (p_phone, p_full_name)
  on conflict (phone) do update set full_name = excluded.full_name
  returning id into v_customer_id;

  -- ---- Insert the booking -------------------------------------------------
  -- The bookings_no_overlap exclusion constraint is the final, race-proof
  -- guard against double-booking a court even under concurrent requests.
  begin
    insert into public.bookings (customer_id, court_id, start_time, end_time, total_price, status)
    values (v_customer_id, p_court_id, p_start_time, p_end_time, p_total_price, 'pending')
    returning id into v_booking_id;
  exception
    when exclusion_violation then
      raise exception 'This court is already booked or pending confirmation for the selected time slot.';
  end;

  return v_booking_id;
end;
$$;

-- Only expose this RPC to anon/authenticated; no other privileges are granted.
revoke all on function public.process_guest_booking(text, text, uuid, timestamptz, timestamptz, numeric) from public;
grant execute on function public.process_guest_booking(text, text, uuid, timestamptz, timestamptz, numeric) to anon, authenticated;
