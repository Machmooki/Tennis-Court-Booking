-- =============================================================================
-- Critical fix: batch (multi-slot) checkout & payment
-- =============================================================================
-- `process_guest_booking` always created one `bookings` row per selected
-- slot, but the payment layer could only ever pay for a single booking_id -
-- a multi-slot checkout silently dropped every slot after the first from
-- the Stripe PaymentIntent. These RPCs are redefined (not overloaded) to
-- operate on a uuid[] of booking ids instead of a single uuid, so one
-- PaymentIntent can cover the guest's entire selection.
--
-- The old scalar-uuid overloads are dropped outright rather than kept
-- alongside the new array versions - nothing should call them anymore once
-- app/booking/payment-actions.ts and the webhook route are updated to
-- always pass arrays (even for a single booking, as a one-element array).
-- =============================================================================

drop function if exists public.create_payment_intent(uuid);
drop function if exists public.confirm_booking_payment(uuid, text, text);
drop function if exists public.get_booking_for_payment(uuid);

-- -----------------------------------------------------------------------------
-- create_payment_intent(uuid[])
-- Read-only "is this whole batch still payable?" check. Verifies every
-- booking is still pending AND belongs to the same customer (a single
-- Stripe PaymentIntent must not be able to pay for a stranger's booking
-- just because its id ended up in the same request), then returns the
-- combined price and a human-readable description for Stripe.
-- -----------------------------------------------------------------------------
create or replace function public.create_payment_intent(
  p_booking_ids uuid[]
)
returns table (
  total_price numeric,
  description text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested_count int;
  v_pending_count int;
  v_customer_count int;
begin
  if p_booking_ids is null or array_length(p_booking_ids, 1) is null then
    raise exception 'At least one booking id is required.';
  end if;

  v_requested_count := array_length(p_booking_ids, 1);

  -- Matches the guard in lib/booking/schema.ts and the ~500-char Stripe
  -- metadata value limit that stores these ids as a joined string.
  if v_requested_count > 10 then
    raise exception 'You can pay for at most 10 bookings at once.';
  end if;

  select count(*) into v_pending_count
  from public.bookings b
  where b.id = any(p_booking_ids) and b.status = 'pending';

  if v_pending_count <> v_requested_count then
    raise exception 'One or more bookings are not awaiting payment (not found, already confirmed, or cancelled).';
  end if;

  select count(distinct b.customer_id) into v_customer_count
  from public.bookings b
  where b.id = any(p_booking_ids);

  if v_customer_count <> 1 then
    raise exception 'All bookings in a single payment must belong to the same customer.';
  end if;

  return query
    select
      sum(b.total_price),
      string_agg(
        c.name || ' ' ||
          to_char(b.start_time at time zone 'Asia/Bangkok', 'Mon DD HH24:MI') || '-' ||
          to_char(b.end_time at time zone 'Asia/Bangkok', 'HH24:MI'),
        ', ' order by b.start_time
      )
    from public.bookings b
    join public.courts c on c.id = b.court_id
    where b.id = any(p_booking_ids);
end;
$$;

revoke all on function public.create_payment_intent(uuid[]) from public;
grant execute on function public.create_payment_intent(uuid[]) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- confirm_booking_payment(uuid[])
-- Called only by the signature-verified webhook (service_role). Confirms
-- every still-pending booking in the batch and records a single
-- transaction for the combined amount.
-- -----------------------------------------------------------------------------
create or replace function public.confirm_booking_payment(
  p_booking_ids uuid[],
  p_payment_intent_id text,
  p_provider_reference text
)
returns table (
  booking_ids uuid[],
  customer_id uuid,
  total_amount numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_total_amount numeric;
  v_confirmed_count int;
begin
  if p_payment_intent_id is null or length(trim(p_payment_intent_id)) = 0 then
    raise exception 'A payment_intent_id is required.';
  end if;

  if p_booking_ids is null or array_length(p_booking_ids, 1) is null then
    raise exception 'At least one booking id is required.';
  end if;

  -- Idempotent: a Stripe webhook retry for a batch that's already fully
  -- confirmed returns the existing totals instead of erroring or
  -- double-inserting a transaction row.
  if not exists (
    select 1 from public.bookings b
    where b.id = any(p_booking_ids) and b.status <> 'confirmed'
  ) then
    select
      sum(b.total_price),
      (array_agg(b.customer_id))[1]
    into v_total_amount, v_customer_id
    from public.bookings b
    where b.id = any(p_booking_ids);

    return query select p_booking_ids, v_customer_id, v_total_amount;
    return;
  end if;

  -- NOTE: if `cancel_expired_pending_bookings` (Phase 4 cron) races this and
  -- cancels some of the batch first, only the still-pending ones are
  -- confirmed here - a production system would credit the customer's
  -- `credit_balance` (or trigger a partial Stripe refund) for the rest
  -- instead of silently under-confirming; out of scope here, same as the
  -- single-booking version this replaces.
  --
  -- Qualify CTE columns: RETURNS TABLE OUT params share these names, so
  -- bare `customer_id` raises "column reference is ambiguous".
  -- Use array_agg (not max/min) - Postgres has no max(uuid).
  with updated as (
    update public.bookings b
    set status = 'confirmed',
        payment_intent_id = p_payment_intent_id
    where b.id = any(p_booking_ids)
      and b.status = 'pending'
    returning b.id, b.customer_id, b.total_price
  )
  select
    count(*)::int,
    (array_agg(updated.customer_id))[1],
    sum(updated.total_price)
  into v_confirmed_count, v_customer_id, v_total_amount
  from updated;

  if v_confirmed_count = 0 then
    raise exception 'No pending bookings found for the given ids.';
  end if;

  insert into public.transactions (customer_id, amount, type, status, provider_reference)
  values (v_customer_id, v_total_amount, 'payment', 'completed', p_provider_reference);

  return query select p_booking_ids, v_customer_id, v_total_amount;
end;
$$;

revoke all on function public.confirm_booking_payment(uuid[], text, text) from public;
grant execute on function public.confirm_booking_payment(uuid[], text, text) to service_role;

-- -----------------------------------------------------------------------------
-- get_bookings_for_payment(uuid[])
-- Batch variant of the dropped get_booking_for_payment(uuid) - powers the
-- /booking/payment page (guests have no SELECT policy on `bookings`; see
-- the Phase 1 migration). One row per booking id found.
-- -----------------------------------------------------------------------------
create or replace function public.get_bookings_for_payment(
  p_booking_ids uuid[]
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
    where b.id = any(p_booking_ids)
    order by b.start_time;
end;
$$;

revoke all on function public.get_bookings_for_payment(uuid[]) from public;
grant execute on function public.get_bookings_for_payment(uuid[]) to anon, authenticated;
