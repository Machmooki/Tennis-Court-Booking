-- =============================================================================
-- Phase 4.1: Real Stripe integration - adjust payment RPCs
-- =============================================================================
-- The mock system minted its own `pi_mock_...` id inside `create_payment_intent`
-- before any provider was involved. With real Stripe Checkout, the real
-- identifier only exists once we've called `stripe.checkout.sessions.create`
-- on the Node side - so a DB round-trip can no longer both validate AND
-- persist an id in the same step. The two RPCs are adjusted accordingly:
--
--   create_payment_intent  - now a read-only "is this still payable?" check
--                             that returns the pricing needed to build the
--                             Checkout Session (amount, description).
--   confirm_booking_payment - now matches by booking_id (trusted from
--                             Stripe's *signed* checkout.session.completed
--                             event metadata, not user input) instead of a
--                             pre-existing payment_intent_id, and persists
--                             Stripe's real id at confirmation time.
-- =============================================================================

create or replace function public.create_payment_intent(
  p_booking_id uuid
)
returns table (
  total_price numeric,
  court_name text,
  start_time timestamptz,
  end_time timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.bookings where id = p_booking_id and status = 'pending'
  ) then
    raise exception 'This booking is not awaiting payment (not found, already confirmed, or cancelled).';
  end if;

  return query
    select
      b.total_price,
      c.name,
      b.start_time,
      b.end_time
    from public.bookings b
    join public.courts c on c.id = b.court_id
    where b.id = p_booking_id;
end;
$$;

-- Signature changed ((text, text) -> (uuid, text, text)), so the old
-- overload has to be dropped explicitly - `create or replace` only replaces
-- a function with the exact same argument types.
drop function if exists public.confirm_booking_payment(text, text);

create or replace function public.confirm_booking_payment(
  p_booking_id uuid,
  p_payment_intent_id text,
  p_provider_reference text
)
returns table (
  booking_id uuid,
  customer_id uuid,
  amount numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking_id uuid;
  v_customer_id uuid;
  v_amount numeric;
begin
  if p_payment_intent_id is null or length(trim(p_payment_intent_id)) = 0 then
    raise exception 'A payment_intent_id is required.';
  end if;

  -- Idempotent: a Stripe webhook retry for an already-confirmed booking
  -- returns the existing result instead of erroring or double-inserting a
  -- transaction row.
  select b.id, b.customer_id, b.total_price
  into v_booking_id, v_customer_id, v_amount
  from public.bookings b
  where b.id = p_booking_id
    and b.status = 'confirmed'
  limit 1;

  if v_booking_id is not null then
    return query select v_booking_id, v_customer_id, v_amount;
    return;
  end if;

  -- NOTE: if `cancel_expired_pending_bookings` (Phase 4 cron) races this and
  -- cancels the booking first, this raises and the payment is effectively
  -- "succeeded but too late". A production system would catch that case and
  -- credit the customer's `credit_balance` (or trigger a Stripe refund)
  -- instead - out of scope here.
  update public.bookings b
  set status = 'confirmed',
      payment_intent_id = p_payment_intent_id
  where b.id = p_booking_id
    and b.status = 'pending'
  returning b.id, b.customer_id, b.total_price
  into v_booking_id, v_customer_id, v_amount;

  if v_booking_id is null then
    raise exception 'No pending booking found for id %.', p_booking_id;
  end if;

  insert into public.transactions (customer_id, amount, type, status, provider_reference)
  values (v_customer_id, v_amount, 'payment', 'completed', p_provider_reference);

  return query select v_booking_id, v_customer_id, v_amount;
end;
$$;

revoke all on function public.confirm_booking_payment(uuid, text, text) from public;
grant execute on function public.confirm_booking_payment(uuid, text, text) to service_role;
