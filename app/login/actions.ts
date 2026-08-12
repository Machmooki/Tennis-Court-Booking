"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type SignInResult = { error: string } | { error?: undefined };

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  redirectTo: z.string().startsWith("/").default("/admin"),
});

function mapAuthError(error: {
  message: string;
  status?: number;
  code?: string;
  name?: string;
}): string {
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message.toLowerCase();

  if (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed")
  ) {
    return "Email not confirmed. Disable Confirm email in Supabase Auth settings, or confirm the user in the Dashboard.";
  }

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  ) {
    return "Invalid email or password.";
  }

  // Surface unexpected auth failures so they aren't silently remapped.
  return error.message || "Unable to sign in. Check the server terminal for details.";
}

export async function signIn(
  _prevState: SignInResult,
  formData: FormData
): Promise<SignInResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") || "/admin",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Log env resolution (never log the raw key).
  try {
    const { url, key } = getSupabaseEnv();
    console.log("[signIn] supabase env ok", {
      urlHost: new URL(url).host,
      keyKind: key.startsWith("sb_publishable_")
        ? "publishable"
        : key.startsWith("eyJ")
          ? "legacy-anon-jwt"
          : "other",
      email: parsed.data.email,
    });
  } catch (envError) {
    console.error("[signIn] env error:", envError);
    return {
      error:
        envError instanceof Error
          ? envError.message
          : "Supabase environment variables are not configured.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Full Auth error object for the terminal — this is what we were masking.
    console.error("[signIn] Supabase auth error:", {
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
      // Serialize enumerable fields in case AuthApiError has extras.
      raw: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))),
    });
    return { error: mapAuthError(error) };
  }

  console.log("[signIn] success", {
    userId: data.user?.id,
    email: data.user?.email,
    role: (data.user?.app_metadata as { role?: string } | undefined)?.role,
    hasSession: Boolean(data.session),
  });

  // Admin routes require app_metadata.role === "admin". Fail fast with a
  // clear message instead of bouncing the user back to /login silently.
  const role = (data.user?.app_metadata as { role?: string } | undefined)
    ?.role;
  if (role !== "admin") {
    console.warn(
      "[signIn] user authenticated but missing app_metadata.role=admin. Set this in Supabase Dashboard → Authentication → Users → user → App Metadata: {\"role\":\"admin\"}"
    );
    await supabase.auth.signOut();
    return {
      error:
        'Signed in, but this account is not an admin. In Supabase Dashboard → Authentication → Users, set App Metadata to {"role":"admin"} and try again.',
    };
  }

  redirect(parsed.data.redirectTo);
}
