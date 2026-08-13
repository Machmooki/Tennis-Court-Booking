-- =============================================================================
-- Phase 5.4.1: Auto-provision a `customers` row for brand-new members
-- =============================================================================
-- `handle_new_user_auto_link` (Phase 5.1) only UPDATEs an existing customer
-- row when a guest previously booked with the same phone number. A member
-- who registers with no booking history has no matching row, so the
-- Customer Dashboard's "select from customers where auth_user_id = ..."
-- lookup would return nothing. Extend the same trigger: if no existing
-- guest row matched, INSERT a fresh `customers` row for them instead.
-- =============================================================================

create or replace function public.handle_new_user_auto_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_full_name text;
  v_linked_count int;
begin
  v_phone := regexp_replace(
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone', ''),
    '\D', '', 'g'
  );

  if v_phone = '' then
    return new;
  end if;

  v_full_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  -- Case 1: this phone already has a guest customer row - link it (as
  -- before). `auth_user_id is null` guard: never steal/overwrite a row
  -- already linked to a different account. `customers.phone` is unique, so
  -- at most one row can ever match.
  update public.customers
  set auth_user_id = new.id
  where phone = v_phone
    and auth_user_id is null;

  get diagnostics v_linked_count = row_count;

  if v_linked_count > 0 then
    return new;
  end if;

  -- Case 2: brand-new member, no booking history yet - provision a fresh
  -- customer row so the Customer Dashboard has something to read. The
  -- `on conflict ... where auth_user_id is null` guard handles the rare
  -- race where a guest booking with this same phone was inserted between
  -- the UPDATE above and this INSERT.
  insert into public.customers (phone, full_name, auth_user_id)
  values (v_phone, coalesce(nullif(v_full_name, ''), 'Member'), new.id)
  on conflict (phone) do update
    set auth_user_id = excluded.auth_user_id
    where public.customers.auth_user_id is null;

  return new;
end;
$$;
