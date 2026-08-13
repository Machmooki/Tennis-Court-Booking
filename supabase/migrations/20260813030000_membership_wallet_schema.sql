-- =============================================================================
-- Phase 5.1: Membership & Hour-Based Wallet Database Schema
-- Tables: packages, wallet_transactions. customers gains `wallet_hours`.
-- Trigger: auto-link a newly-registered auth.users row to any pre-existing
--          guest `customers` row that shares the same phone number, so all
--          of that guest's past bookings become visible to the new account.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. customers: hour-based wallet balance
-- -----------------------------------------------------------------------------
-- `auth_user_id` already exists (Phase 1 initial schema) - `if not exists`
-- keeps this migration re-runnable without erroring. `wallet_hours` is the
-- denormalized current balance; `wallet_transactions` below is the audit
-- ledger that explains how it got there.
alter table public.customers
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null,
  add column if not exists wallet_hours integer not null default 0 check (wallet_hours >= 0);

-- =============================================================================
-- 2. packages - purchasable hour bundles (e.g. "10 Hours - 3,500 THB")
-- =============================================================================
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_thb integer not null check (price_thb >= 0),
  credit_hours integer not null check (credit_hours > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger packages_set_updated_at before update on public.packages
  for each row execute function public.set_updated_at();

alter table public.packages enable row level security;

create policy "Admins manage all packages"
  on public.packages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Anyone can view active packages"
  on public.packages for select
  to anon, authenticated
  using (is_active = true);

-- =============================================================================
-- 3. wallet_transactions - ledger of every hour credit/debit
-- =============================================================================
-- `hours_amount` is signed (topup > 0, usage < 0) so `sum(hours_amount)` per
-- customer is always a valid reconciliation check against `customers.wallet_hours`.
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  package_id uuid references public.packages (id) on delete set null,
  type text not null check (type in ('topup', 'usage')),
  hours_amount integer not null check (
    (type = 'topup' and hours_amount > 0) or
    (type = 'usage' and hours_amount < 0)
  ),
  created_at timestamptz not null default now()
);

create index wallet_transactions_customer_id_idx on public.wallet_transactions (customer_id);
create index wallet_transactions_package_id_idx on public.wallet_transactions (package_id);

alter table public.wallet_transactions enable row level security;

-- Written only by admins, trusted server code (service role), or a future
-- wallet RPC (topup confirmation / booking-with-credit) - never directly by
-- users, mirroring the `transactions` table's trust model from Phase 1.
create policy "Admins manage all wallet transactions"
  on public.wallet_transactions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can view their own wallet transactions"
  on public.wallet_transactions for select
  to authenticated
  using (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
  );

-- =============================================================================
-- 4. Auto-link trigger: auth.users -> customers
-- =============================================================================
-- SECURITY DEFINER is required because this fires as part of the Supabase
-- Auth insert into `auth.users` (not the end user's own RLS-scoped session)
-- and needs to write to `public.customers`. search_path is locked down and
-- every reference is schema-qualified to prevent search_path hijacking,
-- matching the convention used by `process_guest_booking` in Phase 1.
create or replace function public.handle_new_user_auto_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
begin
  -- Registration may arrive via Supabase phone-based auth (the native
  -- `phone` column) or via email/password with a phone field collected in
  -- the signup form (stored in `raw_user_meta_data->>'phone'`) - check both.
  -- Normalize to digits-only to match the canonical form `customers.phone`
  -- is stored in (see the PHONE_REGEX comment in lib/booking/schema.ts).
  v_phone := regexp_replace(
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone', ''),
    '\D', '', 'g'
  );

  if v_phone = '' then
    return new;
  end if;

  -- `auth_user_id is null` guard: never steal/overwrite a customer row that
  -- is already linked to a different account. `customers.phone` is unique,
  -- so at most one row can ever match.
  update public.customers
  set auth_user_id = new.id
  where phone = v_phone
    and auth_user_id is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_link_customer on auth.users;
create trigger on_auth_user_created_link_customer
  after insert on auth.users
  for each row execute function public.handle_new_user_auto_link();
