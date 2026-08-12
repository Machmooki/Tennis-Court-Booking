-- =============================================================================
-- Phase 4.8: Dedicated payment page - booking lookup RPC
-- =============================================================================
-- The dedicated /booking/payment/[id] page needs to show booking + court +
-- customer details for an anonymous guest, but there is deliberately no
-- anon/authenticated SELECT policy on `public.bookings` (see the Phase 1
-- migration) - only admins and the authenticated owner can read it directly.
--
-- This mirrors the trust model `create_payment_intent` already established:
-- the booking's `id` is an unguessable uuid handed to the guest right after
-- they created it (via `process_guest_booking`'s return value and the
-- resulting redirect), so it functions as a capability token. Knowing it is
-- what grants read access here - the same standard as every other payment
-- RPC in this flow.
create or replace function public.get_booking_for_payment(
  p_booking_id uuid
)
returns table (
  booking_id uuid,
  status text,
  total_price numeric,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz,
  court_name text,
  customer_full_name text,
  customer_phone text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select
      b.id,
      b.status,
      b.total_price,
      b.start_time,
      b.end_time,
      b.created_at,
      c.name,
      cu.full_name,
      cu.phone
    from public.bookings b
    join public.courts c on c.id = b.court_id
    join public.customers cu on cu.id = b.customer_id
    where b.id = p_booking_id;
end;
$$;

revoke all on function public.get_booking_for_payment(uuid) from public;
grant execute on function public.get_booking_for_payment(uuid) to anon, authenticated;
