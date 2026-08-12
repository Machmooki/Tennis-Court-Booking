-- =============================================================================
-- Phase 4: Payment Gateway Integration - RPCs
-- =============================================================================
-- Guests have no direct SELECT/UPDATE grant on `bookings` (Phase 1 RLS), so
-- both the "start payment" and "confirm payment" steps go through narrow,
-- SECURITY DEFINER RPCs - exactly like `process_guest_booking`. Each RPC
-- does the minimum necessary mutation atomically (single function = single
-- transaction) and returns only the columns the caller actually needs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- create_payment_intent: mints (or reuses) a mock payment_intent_id for a
-- still-pending booking and hands back enough detail for the client to
-- render a checkout link / QR code. Callable by guests (anon) since a
-- booking_id is only ever known to the guest who just created it.
-- -----------------------------------------------------------------------------
create or replace function public.create_payment_intent(
  p_booking_id uuid
)
returns table (
  payment_intent_id text,
  total_price numeric,
  court_name text,
  start_time timestamptz,
  end_time timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_intent_id text;
begin
  if not exists (select 1 from public.bookings where id = p_booking_id) then
    raise exception 'Booking not found.';
  end if;

  -- Idempotent: re-opening the payment screen reuses the existing intent
  -- instead of minting a new one every time.
  update public.bookings b
  set payment_intent_id = coalesce(
    b.payment_intent_id,
    'pi_mock_' || replace(gen_random_uuid()::text, '-', '')
  )
  where b.id = p_booking_id
    and b.status = 'pending'
  returning b.payment_intent_id into v_payment_intent_id;

  if v_payment_intent_id is null then
    raise exception 'This booking is not awaiting payment (already confirmed or cancelled).';
  end if;

  return query
    select
      v_payment_intent_id,
      b.total_price,
      c.name,
      b.start_time,
      b.end_time
    from public.bookings b
    join public.courts c on c.id = b.court_id
    where b.id = p_booking_id;
end;
$$;

revoke all on function public.create_payment_intent(uuid) from public;
grant execute on function public.create_payment_intent(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- confirm_booking_payment: the only way a booking may transition
-- pending -> confirmed. Only reachable via the signature-verified webhook
-- route using the service_role key - never exposed to anon/authenticated,
-- unlike every other RPC in this project.
-- -----------------------------------------------------------------------------
create or replace function public.confirm_booking_payment(
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

  -- Idempotent: a webhook retry for an already-confirmed payment_intent_id
  -- returns the existing result instead of erroring or double-inserting a
  -- transaction row.
  select b.id, b.customer_id, b.total_price
  into v_booking_id, v_customer_id, v_amount
  from public.bookings b
  where b.payment_intent_id = p_payment_intent_id
    and b.status = 'confirmed'
  limit 1;

  if v_booking_id is not null then
    return query select v_booking_id, v_customer_id, v_amount;
    return;
  end if;

  -- NOTE: if `cancel_expired_pending_bookings` (Phase 4 cron) races this and
  -- cancels the booking first, this raises and the payment is effectively
  -- "succeeded but too late". A production system would catch that case and
  -- credit the customer's `credit_balance` instead - out of scope here.
  update public.bookings b
  set status = 'confirmed'
  where b.payment_intent_id = p_payment_intent_id
    and b.status = 'pending'
  returning b.id, b.customer_id, b.total_price
  into v_booking_id, v_customer_id, v_amount;

  if v_booking_id is null then
    raise exception 'No pending booking found for this payment_intent_id.';
  end if;

  insert into public.transactions (customer_id, amount, type, status, provider_reference)
  values (v_customer_id, v_amount, 'payment', 'completed', p_provider_reference);

  return query select v_booking_id, v_customer_id, v_amount;
end;
$$;

revoke all on function public.confirm_booking_payment(text, text) from public;
grant execute on function public.confirm_booking_payment(text, text) to service_role;
