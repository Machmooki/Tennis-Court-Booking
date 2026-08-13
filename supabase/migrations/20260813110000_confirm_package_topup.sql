-- =============================================================================
-- Phase 7.2: Package Purchase Backend (confirm_package_topup)
-- =============================================================================
-- Credits a member's hour wallet after a Stripe PaymentIntent for a credit
-- package succeeds. Called ONLY from the signature-verified payment webhook
-- (service_role) - never from anon/authenticated clients.
--
-- Why this exists separately from booking payment confirmation:
--   - Booking payments confirm `bookings` rows and do not touch wallets.
--   - Package top-ups credit `wallet_hours_*` and write BOTH a
--     `wallet_transactions` ledger row (hours) AND a `transactions` cash-flow
--     row (THB) so the admin analytics dashboard (Phase 6.3 cash-flow) sees
--     real money received without double-counting later wallet-paid bookings.
--
-- Idempotency: Stripe may retry `payment_intent.succeeded`. We treat an
-- existing completed `transactions` row with the same `provider_reference`
-- as "already applied" and return the current wallet balances without
-- crediting again.
-- =============================================================================

create or replace function public.confirm_package_topup(
  p_customer_id uuid,
  p_package_id uuid,
  p_payment_intent_id text
)
returns table (
  customer_id uuid,
  package_id uuid,
  hours_credited integer,
  usable_at text,
  wallet_hours_all_time integer,
  wallet_hours_off_peak integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_credit_hours integer;
  v_price_thb integer;
  v_usable_at text;
  v_all_time integer;
  v_off_peak integer;
  v_existing_customer_id uuid;
begin
  if p_customer_id is null then
    raise exception 'A customer id is required.';
  end if;

  if p_package_id is null then
    raise exception 'A package id is required.';
  end if;

  if p_payment_intent_id is null or length(trim(p_payment_intent_id)) = 0 then
    raise exception 'A payment_intent_id is required.';
  end if;

  -- Idempotent webhook retries: if we already recorded this PaymentIntent as
  -- a completed payment, do not credit hours a second time.
  select t.customer_id
  into v_existing_customer_id
  from public.transactions t
  where t.provider_reference = p_payment_intent_id
    and t.type = 'payment'
    and t.status = 'completed'
  limit 1;

  if v_existing_customer_id is not null then
    select c.wallet_hours_all_time, c.wallet_hours_off_peak
    into v_all_time, v_off_peak
    from public.customers c
    where c.id = v_existing_customer_id;

    -- Re-read package metadata for a complete return payload; if the package
    -- was deleted meanwhile, return zeros for hours/usable_at rather than
    -- failing a webhook retry for an already-applied payment.
    select p.credit_hours, p.usable_at
    into v_credit_hours, v_usable_at
    from public.packages p
    where p.id = p_package_id;

    return query
      select
        v_existing_customer_id,
        p_package_id,
        coalesce(v_credit_hours, 0),
        coalesce(v_usable_at, 'all_times'),
        coalesce(v_all_time, 0),
        coalesce(v_off_peak, 0);
    return;
  end if;

  select p.credit_hours, p.price_thb, p.usable_at
  into v_credit_hours, v_price_thb, v_usable_at
  from public.packages p
  where p.id = p_package_id
    and p.is_active = true;

  if v_credit_hours is null then
    raise exception 'Package not found or is no longer available.';
  end if;

  -- Lock the customer wallet row for the rest of this transaction so two
  -- concurrent top-ups for the same member can't race the balance update.
  select c.wallet_hours_all_time, c.wallet_hours_off_peak
  into v_all_time, v_off_peak
  from public.customers c
  where c.id = p_customer_id
  for update;

  if v_all_time is null then
    raise exception 'Customer not found.';
  end if;

  if v_usable_at = 'off_peak' then
    v_off_peak := v_off_peak + v_credit_hours;
  else
    -- 'all_times' (and any unexpected value) credits the flexible bucket.
    v_all_time := v_all_time + v_credit_hours;
  end if;

  update public.customers c
  set
    wallet_hours_all_time = v_all_time,
    wallet_hours_off_peak = v_off_peak
  where c.id = p_customer_id;

  insert into public.wallet_transactions (
    customer_id,
    package_id,
    type,
    hours_amount
  )
  values (
    p_customer_id,
    p_package_id,
    'topup',
    v_credit_hours
  );

  -- Cash-flow ledger for the admin analytics dashboard (Phase 6.3). Using
  -- the PaymentIntent id as provider_reference also powers the idempotency
  -- check above on webhook retries.
  insert into public.transactions (
    customer_id,
    amount,
    type,
    status,
    provider_reference
  )
  values (
    p_customer_id,
    v_price_thb,
    'payment',
    'completed',
    p_payment_intent_id
  );

  return query
    select
      p_customer_id,
      p_package_id,
      v_credit_hours,
      v_usable_at,
      v_all_time,
      v_off_peak;
end;
$$;

comment on function public.confirm_package_topup(uuid, uuid, text) is
  'Service-role only. Credits a member wallet after a package Stripe payment succeeds; writes wallet + cash-flow ledger rows. Idempotent on payment_intent_id.';

-- This project's public schema default privileges auto-grant EXECUTE to
-- anon/authenticated/service_role on new functions - revoke broadly first,
-- then grant ONLY to service_role (same pattern as confirm_booking_payment).
revoke all on function public.confirm_package_topup(uuid, uuid, text) from public;
revoke all on function public.confirm_package_topup(uuid, uuid, text) from anon;
revoke all on function public.confirm_package_topup(uuid, uuid, text) from authenticated;
grant execute on function public.confirm_package_topup(uuid, uuid, text) to service_role;
