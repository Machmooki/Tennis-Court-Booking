-- =============================================================================
-- Phase 6.3 Refactoring: shift the admin dashboard to "Actual Cash Flow"
-- =============================================================================
-- `bookings.total_price` is the *nominal* value of a slot, not money actually
-- received - a wallet-paid booking (pay_with_wallet RPC) has a total_price
-- too, even though no cash changed hands that day (it was pre-paid when the
-- customer topped up their wallet). Summing it as "revenue" would double
-- count once wallet purchases go through this same dashboard. `total_revenue`
-- now sums real completed payments from `public.transactions` instead
-- (currently only ever inserted by `confirm_booking_payment` for
-- Stripe/PromptPay charges - see 20260813000000_batch_payment_rpcs.sql).
--
-- All three activity metrics (`total_revenue`, `total_bookings`,
-- `bookings_by_court`) are now scoped to the current calendar month so the
-- dashboard reads as "how is this month going", not an all-time total that
-- only ever grows. `total_members` stays all-time - membership count is a
-- running total, not a monthly activity metric.
-- =============================================================================

create or replace function public.get_admin_analytics()
returns jsonb
language plpgsql
security invoker
stable
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  select jsonb_build_object(
    'total_revenue', coalesce((
      select sum(t.amount)
      from public.transactions t
      where t.type = 'payment'
        and t.status = 'completed'
        and date_trunc('month', t.created_at) = date_trunc('month', current_date)
    ), 0),
    'total_bookings', coalesce((
      select count(*)
      from public.bookings b
      where b.status = 'confirmed'
        and date_trunc('month', b.created_at) = date_trunc('month', current_date)
    ), 0),
    'total_members', coalesce((
      select count(*) from public.customers where auth_user_id is not null
    ), 0),
    -- Per-court chart still uses booking `total_price` (not `transactions`):
    -- a single Stripe payment can cover a multi-court, multi-slot batch, so
    -- there is no clean way to attribute one transaction back to one court.
    -- `revenue` here is therefore each court's nominal booking value this
    -- month, kept alongside the cash-flow KPI above rather than conflated
    -- with it.
    'bookings_by_court', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'court_id', agg.court_id,
          'court_name', c.name,
          'bookings_count', agg.bookings_count,
          'revenue', agg.revenue
        )
        order by agg.revenue desc
      )
      from (
        select court_id, count(*) as bookings_count, sum(total_price) as revenue
        from public.bookings
        where status = 'confirmed'
          and date_trunc('month', created_at) = date_trunc('month', current_date)
        group by court_id
      ) agg
      join public.courts c on c.id = agg.court_id
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

-- Grants are unchanged from the previous migration (authenticated only, is_admin()
-- enforced inside; anon explicitly locked out due to this project's default
-- privileges auto-granting EXECUTE on new functions), but CREATE OR REPLACE
-- does not touch existing grants, so nothing further to do here.
