-- =============================================================================
-- Phase 6.1: Admin Member Management & Manual Wallet Adjustment
-- =============================================================================
-- Counter staff often sell packages for cash; this RPC lets an admin credit
-- (or claw back) hour balances atomically while writing an audit row to
-- `wallet_transactions`. A dedicated `admin_adjustment` type keeps counter
-- top-ups distinct from package purchases (`topup`) and booking spend
-- (`usage`). `note` stores the free-text reason from the admin UI.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend wallet_transactions for admin adjustments
-- -----------------------------------------------------------------------------
alter table public.wallet_transactions
  add column if not exists note text;

-- Drop the old type/amount checks so we can re-add them with the new type.
alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_type_check;

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_hours_amount_check;

-- Postgres auto-names the CHECK from `type in (...)` as
-- `wallet_transactions_type_check`; the compound hours_amount CHECK may have
-- a generated name - find and drop any leftover hours_amount checks.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'wallet_transactions'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%hours_amount%'
  loop
    execute format(
      'alter table public.wallet_transactions drop constraint %I',
      r.conname
    );
  end loop;
end;
$$;

alter table public.wallet_transactions
  add constraint wallet_transactions_type_check
  check (type in ('topup', 'usage', 'admin_adjustment'));

alter table public.wallet_transactions
  add constraint wallet_transactions_hours_amount_check
  check (
    (type = 'topup' and hours_amount > 0) or
    (type = 'usage' and hours_amount < 0) or
    (type = 'admin_adjustment' and hours_amount <> 0)
  );

-- -----------------------------------------------------------------------------
-- 2. admin_adjust_wallet - atomic credit/debit for admins only
-- -----------------------------------------------------------------------------
create or replace function public.admin_adjust_wallet(
  p_customer_id uuid,
  p_all_time_change integer,
  p_off_peak_change integer,
  p_reason text
)
returns table (
  customer_id uuid,
  wallet_hours_all_time integer,
  wallet_hours_off_peak integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_all_time integer;
  v_off_peak integer;
  v_reason text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  if p_customer_id is null then
    raise exception 'A customer id is required.';
  end if;

  v_reason := trim(coalesce(p_reason, ''));
  if length(v_reason) < 3 then
    raise exception 'A reason of at least 3 characters is required.';
  end if;

  if coalesce(p_all_time_change, 0) = 0 and coalesce(p_off_peak_change, 0) = 0 then
    raise exception 'At least one wallet bucket must change.';
  end if;

  -- Serialize concurrent adjustments against the same member.
  select c.wallet_hours_all_time, c.wallet_hours_off_peak
  into v_all_time, v_off_peak
  from public.customers c
  where c.id = p_customer_id
    and c.auth_user_id is not null
  for update;

  if not found then
    raise exception 'Member not found.';
  end if;

  if v_all_time + coalesce(p_all_time_change, 0) < 0 then
    raise exception 'All-Time balance cannot go below zero.';
  end if;

  if v_off_peak + coalesce(p_off_peak_change, 0) < 0 then
    raise exception 'Off-Peak balance cannot go below zero.';
  end if;

  update public.customers c
  set wallet_hours_all_time = c.wallet_hours_all_time + coalesce(p_all_time_change, 0),
      wallet_hours_off_peak = c.wallet_hours_off_peak + coalesce(p_off_peak_change, 0)
  where c.id = p_customer_id
  returning c.wallet_hours_all_time, c.wallet_hours_off_peak
  into v_all_time, v_off_peak;

  if coalesce(p_all_time_change, 0) <> 0 then
    insert into public.wallet_transactions (
      customer_id, type, hours_amount, note
    ) values (
      p_customer_id,
      'admin_adjustment',
      p_all_time_change,
      '[All-Time] ' || v_reason
    );
  end if;

  if coalesce(p_off_peak_change, 0) <> 0 then
    insert into public.wallet_transactions (
      customer_id, type, hours_amount, note
    ) values (
      p_customer_id,
      'admin_adjustment',
      p_off_peak_change,
      '[Off-Peak] ' || v_reason
    );
  end if;

  return query select p_customer_id, v_all_time, v_off_peak;
end;
$$;

revoke all on function public.admin_adjust_wallet(uuid, integer, integer, text) from public;
revoke execute on function public.admin_adjust_wallet(uuid, integer, integer, text) from anon;
-- Authenticated callers still hit `is_admin()` inside the function; non-admins
-- get a clean exception. service_role keeps EXECUTE via default owner grants.
grant execute on function public.admin_adjust_wallet(uuid, integer, integer, text) to authenticated;
