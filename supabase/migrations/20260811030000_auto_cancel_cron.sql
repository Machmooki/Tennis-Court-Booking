-- =============================================================================
-- Phase 4: Auto-cancellation automation (pg_cron)
-- =============================================================================
-- Unpaid ('pending') bookings older than 15 minutes are auto-cancelled every
-- minute. Cancelling just flips `status`, which is all that's needed to free
-- the slot: `public.court_availability` already filters out cancelled rows
-- (instant on the next read), and the existing
-- `bookings_broadcast_availability` trigger from the Phase 3 migration fires
-- on this UPDATE like any other, pushing the release to guests' live grids
-- immediately with no extra wiring here.
--
-- If `create extension pg_cron` fails with a permission error on a hosted
-- Supabase project, enable pg_cron once via
-- Dashboard -> Database -> Extensions, then re-run this migration - the
-- rest of it is idempotent.
-- =============================================================================

create extension if not exists pg_cron;

create or replace function public.cancel_expired_pending_bookings()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings
  set status = 'cancelled'
  where status = 'pending'
    and created_at < now() - interval '15 minutes';
$$;

comment on function public.cancel_expired_pending_bookings() is
  'Releases pending bookings older than 15 minutes. Run every minute by the auto-cancel-unpaid-bookings pg_cron job.';

revoke all on function public.cancel_expired_pending_bookings() from public;

-- `cron.schedule` upserts by job name (case-sensitive), so re-running this
-- migration safely replaces the existing schedule instead of duplicating it.
select cron.schedule(
  'auto-cancel-unpaid-bookings',
  '* * * * *', -- every minute
  $$select public.cancel_expired_pending_bookings();$$
);
