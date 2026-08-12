-- =============================================================================
-- Phase 3: Guest-First Booking Flow - read-only availability surface
-- =============================================================================
-- `bookings` intentionally has NO anon SELECT policy (Phase 1) so guests can
-- never read customer_id / total_price / payment_intent_id. The public
-- booking grid still needs to know which slots are taken, so we expose a
-- narrow, non-sensitive view instead of loosening RLS on the base table.
--
-- Views run with the privileges of their OWNER unless `security_invoker` is
-- set. This migration runs as the table owner, which bypasses RLS on
-- `bookings` (no FORCE ROW LEVEL SECURITY is set) - that's intentional here:
-- we want the view to surface every non-cancelled booking's occupancy
-- regardless of which customer it belongs to, which is broader than any
-- per-user RLS policy would allow. Do not `select *` from `bookings` in this
-- view; only ever add columns here that are safe to expose to anyone.
-- =============================================================================

create view public.court_availability as
select
  b.court_id,
  b.start_time,
  b.end_time,
  b.status
from public.bookings b
where b.status <> 'cancelled';

comment on view public.court_availability is
  'Public, non-sensitive booking occupancy (no customer_id/price/payment_intent_id) for the guest booking grid.';

grant select on public.court_availability to anon, authenticated;

-- =============================================================================
-- Realtime: broadcast sanitized booking changes to the guest booking grid
-- =============================================================================
-- We deliberately do NOT use `realtime.broadcast_changes()` here, since it
-- broadcasts the full NEW/OLD row (customer_id, total_price,
-- payment_intent_id) to a topic that anonymous guests subscribe to. Instead
-- we hand-build a sanitized payload with only the columns already exposed by
-- `court_availability`, and send it as a PUBLIC broadcast (no Realtime
-- Authorization / auth required to subscribe) on a single shared topic.
create or replace function public.broadcast_booking_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'operation', tg_op,
      'booking_id', coalesce(new.id, old.id),
      'court_id', coalesce(new.court_id, old.court_id),
      'start_time', coalesce(new.start_time, old.start_time),
      'end_time', coalesce(new.end_time, old.end_time),
      'status', coalesce(new.status, old.status)
    ),
    tg_op,                    -- event name: INSERT | UPDATE | DELETE
    'bookings-availability',  -- topic: single shared, public channel
    false                     -- public broadcast: guests can subscribe without auth
  );

  return null;
end;
$$;

create trigger bookings_broadcast_availability
  after insert or update or delete on public.bookings
  for each row execute function public.broadcast_booking_availability();
