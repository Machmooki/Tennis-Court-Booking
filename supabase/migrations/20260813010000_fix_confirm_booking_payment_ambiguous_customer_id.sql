-- =============================================================================
-- Fix: confirm_booking_payment(uuid[]) ambiguous customer_id
-- =============================================================================
-- PL/pgSQL RETURNS TABLE declares OUT params (`customer_id`, `total_amount`)
-- in function scope. The CTE select used bare `max(customer_id)`, which
-- Postgres treated as ambiguous vs the OUT param and raised at webhook time:
--   column reference "customer_id" is ambiguous
-- Qualify CTE columns so payment_intent.succeeded can confirm bookings.
-- =============================================================================

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
  -- Qualify CTE columns: RETURNS TABLE OUT params share these names.
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
