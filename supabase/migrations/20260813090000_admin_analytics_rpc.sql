-- =============================================================================
-- Phase 6.3: Admin Analytics Dashboard (Advanced Data Aggregation)
-- =============================================================================
-- Aggregations (SUM/COUNT/GROUP BY joined across tables) are awkward and
-- slow to assemble client-side through supabase-js, so this single RPC does
-- all of the heavy lifting in one round trip and returns a ready-to-render
-- JSON payload for the admin dashboard.
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
  -- `security invoker` means this already runs under the caller's own RLS
  -- (only admins can see every row), but we fail fast with a clear error
  -- instead of silently returning a non-admin's own scoped-down counts.
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  select jsonb_build_object(
    'total_revenue', coalesce(
      (select sum(total_price) from public.bookings where status = 'confirmed'),
      0
    ),
    'total_bookings', (
      select count(*) from public.bookings where status = 'confirmed'
    ),
    'total_members', (
      select count(*) from public.customers where auth_user_id is not null
    ),
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
        group by court_id
      ) agg
      join public.courts c on c.id = agg.court_id
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

comment on function public.get_admin_analytics() is
  'Admin-only dashboard aggregate: total revenue/bookings/members plus a per-court breakdown, all from confirmed bookings.';

-- This project's `public` schema has default privileges that auto-grant
-- EXECUTE on newly created functions to anon/authenticated/service_role -
-- `revoke ... from public` alone does NOT undo those extra per-role grants
-- (same pitfall hit with `pay_with_wallet`), so anon is revoked explicitly.
-- service_role keeps EXECUTE since it bypasses RLS/the is_admin() check
-- entirely and Supabase's own internals may rely on service_role having
-- broad function access; anon must never reach an admin-only aggregate.
revoke all on function public.get_admin_analytics() from public;
revoke all on function public.get_admin_analytics() from anon;
grant execute on function public.get_admin_analytics() to authenticated;
