-- =============================================================================
-- Phase 6.2: Admin Interactive Master Grid & Court Blocking
-- =============================================================================
-- Adds a 'blocked' booking status (admin taking a slot offline for
-- maintenance/events) and a free-text `note` column (block reason, or admin
-- remarks on a manual booking). `bookings.customer_id` stays NOT NULL - a
-- dedicated system "Court Blocked" customer row is used for blocked slots
-- rather than loosening that constraint, so every other query/RLS policy
-- that already joins bookings -> customers keeps working unchanged.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Allow 'blocked' as a booking status
-- -----------------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'blocked'));

-- The overlap-prevention exclusion constraint already applies to every
-- non-cancelled status (`where (status <> 'cancelled')` from the Phase 1
-- migration), so 'blocked' slots automatically prevent double-booking
-- without any change there. Same for `court_availability`
-- (`where status <> 'cancelled'`) - blocked slots correctly show as
-- unavailable to guests too.

-- -----------------------------------------------------------------------------
-- 2. Free-text note (block reason / admin remarks)
-- -----------------------------------------------------------------------------
alter table public.bookings
  add column if not exists note text;

-- -----------------------------------------------------------------------------
-- 3. System customer row for blocked slots
-- -----------------------------------------------------------------------------
-- `customer_id` is a mandatory FK, so blocking a slot still needs a row to
-- point at. This one is never linked to a real auth account and is excluded
-- from the admin Members list (Phase 6.1 filters on `auth_user_id is not
-- null`) and from any member's own booking history (nothing ever sets
-- `auth_user_id` on it).
insert into public.customers (phone, full_name)
values ('0000000000', 'Court Blocked (System)')
on conflict (phone) do nothing;
