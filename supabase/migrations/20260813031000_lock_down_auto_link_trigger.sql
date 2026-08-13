-- =============================================================================
-- Fix: handle_new_user_auto_link() was callable via PostgREST
-- =============================================================================
-- Supabase's linter flagged public.handle_new_user_auto_link() as callable
-- by anon/authenticated at /rest/v1/rpc/handle_new_user_auto_link, since any
-- function in the `public` schema is exposed by default. It is a
-- SECURITY DEFINER trigger function only, never meant to be invoked
-- directly - trigger execution does not require EXECUTE privilege, so
-- revoking it here has no effect on the auto-link behavior.
-- =============================================================================

revoke all on function public.handle_new_user_auto_link() from public, anon, authenticated;
