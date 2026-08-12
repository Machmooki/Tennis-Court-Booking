-- =============================================================================
-- Phase 4.10: Manual cancellation on the payment page
-- =============================================================================
-- Guests have no anon UPDATE policy on `public.bookings` (Phase 1 RLS only
-- lets authenticated owners cancel their own pending rows). The payment page
-- is used by anonymous guests who already hold the booking uuid(s) as a
-- capability token (same trust model as `get_bookings_for_payment`), so this
-- security-definer RPC lets them release still-pending slots immediately
-- without waiting for `cancel_expired_pending_bookings` (pg_cron).
-- =============================================================================

create or replace function public.cancel_pending_bookings(
  p_booking_ids uuid[]
)
returns table (
  cancelled_count int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested_count int;
  v_cancelled_count int;
begin
  if p_booking_ids is null or array_length(p_booking_ids, 1) is null then
    raise exception 'At least one booking id is required.';
  end if;

  v_requested_count := array_length(p_booking_ids, 1);

  if v_requested_count > 10 then
    raise exception 'You can cancel at most 10 bookings at once.';
  end if;

  -- Idempotent: every id is already cancelled → success with 0 new updates.
  if not exists (
    select 1
    from public.bookings b
    where b.id = any(p_booking_ids)
      and b.status <> 'cancelled'
  ) then
    return query select 0;
    return;
  end if;

  -- Never touch confirmed (paid) rows - only release unpaid reservations.
  update public.bookings b
  set status = 'cancelled'
  where b.id = any(p_booking_ids)
    and b.status = 'pending';

  get diagnostics v_cancelled_count = row_count;

  if v_cancelled_count = 0 then
    raise exception 'These bookings can no longer be cancelled (already paid or not found).';
  end if;

  return query select v_cancelled_count;
end;
$$;

revoke all on function public.cancel_pending_bookings(uuid[]) from public;
grant execute on function public.cancel_pending_bookings(uuid[]) to anon, authenticated;
