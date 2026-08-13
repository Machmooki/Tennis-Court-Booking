-- =============================================================================
-- Phase 5.2: Package Time-Constraints (Two-Bucket Wallet)
-- =============================================================================
-- Quiet-hours (off-peak) packages vs prime-time (all times) packages need
-- separate wallet balances. A single `wallet_hours` column cannot express
-- "hours that may only be spent off-peak", so we split into:
--   * wallet_hours_all_time  - usable any time (peak & off-peak)
--   * wallet_hours_off_peak  - usable only during off-peak windows
-- Packages declare which bucket they top up via `usable_at`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. packages.usable_at
-- -----------------------------------------------------------------------------
alter table public.packages
  add column if not exists usable_at text not null default 'all_times';

-- Idempotent: drop then re-add so re-running this migration never fails.
alter table public.packages
  drop constraint if exists packages_usable_at_check;

alter table public.packages
  add constraint packages_usable_at_check
  check (usable_at in ('all_times', 'off_peak'));

comment on column public.packages.usable_at is
  'Which wallet bucket this package credits: all_times (peak+off-peak) or off_peak only.';

-- -----------------------------------------------------------------------------
-- 2. customers: rename wallet_hours -> wallet_hours_all_time, add off-peak
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'wallet_hours'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'wallet_hours_all_time'
  ) then
    alter table public.customers
      rename column wallet_hours to wallet_hours_all_time;
  end if;
end $$;

-- If a fresh DB somehow never had wallet_hours (shouldn't happen after 5.1),
-- still ensure the all-time column exists.
alter table public.customers
  add column if not exists wallet_hours_all_time integer not null default 0;

alter table public.customers
  add column if not exists wallet_hours_off_peak integer not null default 0;

-- Re-assert non-negative checks. Renaming preserves the original
-- `customers_wallet_hours_check` name pointing at the renamed column, so
-- drop both old and new names before recreating a clean constraint.
alter table public.customers
  drop constraint if exists customers_wallet_hours_check;

alter table public.customers
  drop constraint if exists customers_wallet_hours_all_time_check;

alter table public.customers
  add constraint customers_wallet_hours_all_time_check
  check (wallet_hours_all_time >= 0);

alter table public.customers
  drop constraint if exists customers_wallet_hours_off_peak_check;

alter table public.customers
  add constraint customers_wallet_hours_off_peak_check
  check (wallet_hours_off_peak >= 0);

comment on column public.customers.wallet_hours_all_time is
  'Hour credits usable at any time (peak and off-peak).';
comment on column public.customers.wallet_hours_off_peak is
  'Hour credits usable only during off-peak windows.';
