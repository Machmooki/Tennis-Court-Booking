import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Reads/writes the auth session via cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // Called from a Server Component render where cookies can't be set.
          // Session refresh in proxy.ts handles writing cookies instead.
          // Re-throwing here would break Server Component reads; only log so
          // Server Action cookie failures are still visible in the terminal.
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "[supabase/server] cookie setAll skipped (likely Server Component):",
              error instanceof Error ? error.message : error
            );
          }
        }
      },
    },
  });
}
