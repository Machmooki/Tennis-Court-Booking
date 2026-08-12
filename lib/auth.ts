import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string | null;
}

/**
 * Returns the current user only if they are an admin, based on
 * `app_metadata.role` (server-controlled, never the user-editable
 * `user_metadata`). Mirrors the `is_admin()` Postgres function used in RLS.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  const role = (data.user.app_metadata as { role?: string } | undefined)
    ?.role;
  if (role !== "admin") return null;

  return { id: data.user.id, email: data.user.email ?? null };
}
