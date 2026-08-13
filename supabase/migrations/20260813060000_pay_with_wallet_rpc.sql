-- =============================================================================
-- Phase 5.4.2: Wallet Payment Flow Integration
-- =============================================================================
-- Lets a signed-in member pay for their own pending bookings out of their
-- hour-based credit wallet instead of Stripe, when their balance covers it.
--
-- Two-bucket rule (matches Phase 5.2 packages.usable_at):
--   - `wallet_hours_all_time` is the flexible bucket - it can cover peak OR
--     off-peak slots.
--   - `wallet_hours_off_peak` can ONLY cover off-peak slots.
--   - Peak slots must therefore be paid entirely out of `wallet_hours_all_time`.
--   - Off-peak slots are paid from `wallet_hours_off_peak` first, then spill
--     into any `wallet_hours_all_time` left over after covering peak slots.
--
-- Atomicity/anti-double-spend: the whole check-then-deduct-then-confirm
-- sequence runs inside one PL/pgSQL function call, which Postgres executes
-- as a single transaction - any `raise exception` (including the final
-- "not everything confirmed" guard) rolls back the wallet deduction and
-- transaction-ledger inserts too. `select ... for update` on the customer
-- row additionally serializes concurrent wallet-payment attempts for the
-- same member so two racing requests can't both read the same balance.
-- =============================================================================

create or replace function public.pay_with_wallet(
  p_booking_ids uuid[]
)
returns table (
  booking_ids uuid[],
  customer_id uuid,
  hours_deducted_all_time integer,
  hours_deducted_off_peak integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_user_id uuid;
  v_customer_id uuid;
  v_all_time integer;
  v_off_peak integer;
  v_requested_count int;
  v_pending_count int;
  v_own_count int;
  v_peak_hours numeric;
  v_off_peak_hours numeric;
  v_peak_hours_int int;
  v_off_peak_hours_int int;
  v_from_off_peak int;
  v_from_all_time_for_off_peak int;
  v_all_time_debit int;
  v_confirmed_count int;
begin
  v_auth_user_id := auth.uid();
  if v_auth_user_id is null then
    raise exception 'You must be signed in to pay with wallet credit.';
  end if;

  if p_booking_ids is null or array_length(p_booking_ids, 1) is null then
    raise exception 'At least one booking id is required.';
  end if;

  v_requested_count := array_length(p_booking_ids, 1);
  if v_requested_count > 10 then
    raise exception 'You can pay for at most 10 bookings at once.';
  end if;

  -- Locks this member's wallet row for the rest of the transaction.
  select id, wallet_hours_all_time, wallet_hours_off_peak
  into v_customer_id, v_all_time, v_off_peak
  from public.customers
  where auth_user_id = v_auth_user_id
  for update;

  if v_customer_id is null then
    raise exception 'No member profile is linked to this account.';
  end if;

  -- Idempotent: if a duplicate click (or a Stripe payment that landed
  -- first) already confirmed every booking in the batch, succeed without
  -- touching the wallet again.
  if not exists (
    select 1 from public.bookings b
    where b.id = any(p_booking_ids) and b.status <> 'confirmed'
  ) then
    return query select p_booking_ids, v_customer_id, 0, 0;
    return;
  end if;

  select count(*) into v_pending_count
  from public.bookings b
  where b.id = any(p_booking_ids) and b.status = 'pending';

  if v_pending_count <> v_requested_count then
    raise exception 'One or more bookings are not awaiting payment (not found, already confirmed, or cancelled).';
  end if;

  select count(*) into v_own_count
  from public.bookings b
  where b.id = any(p_booking_ids) and b.customer_id = v_customer_id;

  if v_own_count <> v_requested_count then
    raise exception 'You can only pay for your own bookings with wallet credit.';
  end if;

  -- Same peak window as lib/booking/pricing.ts (17:00-21:00 Bangkok, by each
  -- slot's start time) - keep these in sync if that rule ever changes.
  select
    coalesce(sum(case
      when extract(hour from b.start_time at time zone 'Asia/Bangkok') >= 17
       and extract(hour from b.start_time at time zone 'Asia/Bangkok') < 21
      then extract(epoch from (b.end_time - b.start_time)) / 3600
      else 0
    end), 0),
    coalesce(sum(case
      when extract(hour from b.start_time at time zone 'Asia/Bangkok') >= 17
       and extract(hour from b.start_time at time zone 'Asia/Bangkok') < 21
      then 0
      else extract(epoch from (b.end_time - b.start_time)) / 3600
    end), 0)
  into v_peak_hours, v_off_peak_hours
  from public.bookings b
  where b.id = any(p_booking_ids);

  v_peak_hours_int := round(v_peak_hours)::int;
  v_off_peak_hours_int := round(v_off_peak_hours)::int;

  if v_all_time < v_peak_hours_int then
    raise exception 'Insufficient wallet hours.';
  end if;

  if (v_off_peak + (v_all_time - v_peak_hours_int)) < v_off_peak_hours_int then
    raise exception 'Insufficient wallet hours.';
  end if;

  v_from_off_peak := least(v_off_peak, v_off_peak_hours_int);
  v_from_all_time_for_off_peak := v_off_peak_hours_int - v_from_off_peak;
  v_all_time_debit := v_peak_hours_int + v_from_all_time_for_off_peak;

  update public.customers
  set wallet_hours_all_time = wallet_hours_all_time - v_all_time_debit,
      wallet_hours_off_peak = wallet_hours_off_peak - v_from_off_peak
  where id = v_customer_id;

  if v_all_time_debit > 0 then
    insert into public.wallet_transactions (customer_id, type, hours_amount)
    values (v_customer_id, 'usage', -v_all_time_debit);
  end if;

  if v_from_off_peak > 0 then
    insert into public.wallet_transactions (customer_id, type, hours_amount)
    values (v_customer_id, 'usage', -v_from_off_peak);
  end if;

  update public.bookings b
  set status = 'confirmed'
  where b.id = any(p_booking_ids)
    and b.status = 'pending';

  get diagnostics v_confirmed_count = row_count;

  -- A race (e.g. the auto-cancel cron or a concurrent Stripe confirmation)
  -- changed a booking's status out from under us - abort and roll back the
  -- wallet deduction above rather than silently under-confirming.
  if v_confirmed_count <> v_requested_count then
    raise exception 'Could not confirm all bookings - please try again.';
  end if;

  return query select p_booking_ids, v_customer_id, v_all_time_debit, v_from_off_peak;
end;
$$;

-- Wallet payments require a real member session (auth.uid()) - unlike the
-- Stripe RPCs above, `anon` must never be granted execute here. This project
-- has default privileges that auto-grant EXECUTE to `anon`/`authenticated`
-- on newly created public-schema functions, so `anon` must be revoked
-- explicitly - `revoke ... from public` alone does not touch it.
revoke all on function public.pay_with_wallet(uuid[]) from public;
revoke execute on function public.pay_with_wallet(uuid[]) from anon;
grant execute on function public.pay_with_wallet(uuid[]) to authenticated;
