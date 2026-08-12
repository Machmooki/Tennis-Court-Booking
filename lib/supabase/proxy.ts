import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase auth session on every matched request.
 * Must return the same response object that received the refreshed cookies.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([headerName, value]) =>
          supabaseResponse.headers.set(headerName, value)
        );
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  // getClaims() validates/refreshes the JWT so Server Components see a fresh session.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
