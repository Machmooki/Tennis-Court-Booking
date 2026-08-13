"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { memberRegisterSchema } from "@/lib/member/schema";

export type RegisterMemberResult =
  | { error: string; needsEmailConfirmation?: undefined }
  | { error?: undefined; needsEmailConfirmation?: boolean };

function mapSignUpError(error: { message: string; code?: string }): string {
  const message = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? "";

  if (
    code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }

  return error.message || "Unable to create your account. Please try again.";
}

/**
 * Registers a new member via Supabase Email/Password auth. `full_name` and
 * `phone` are passed through `options.data` into `raw_user_meta_data`, which
 * `handle_new_user_auto_link` (Phase 5.1/5.4.1) reads on the `auth.users`
 * AFTER INSERT trigger to auto-link past guest bookings (or provision a
 * fresh `customers` row) by phone number.
 *
 * Phase 7.4 note: Email/Password is a placeholder auth strategy. Since every
 * guest booking is already keyed by phone number, Supabase Phone/SMS OTP
 * (`supabase.auth.signInWithOtp({ phone })`) is the more natural long-term
 * fit here and should replace this flow once SMS provider costs/volume are
 * sorted out - the auto-link trigger already keys off `phone`, so swapping
 * the auth method shouldn't require touching that linking logic.
 */
export async function registerMember(
  _prevState: RegisterMemberResult,
  formData: FormData
): Promise<RegisterMemberResult> {
  const parsed = memberRegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
      },
    },
  });

  if (error) {
    console.error("[registerMember] Supabase auth error:", {
      name: error.name,
      message: error.message,
      code: error.code,
    });
    return { error: mapSignUpError(error) };
  }

  // A Supabase project with "Confirm email" enabled returns a user but no
  // session until the guest clicks the confirmation link - nothing to
  // redirect into yet.
  if (!data.session) {
    return { needsEmailConfirmation: true };
  }

  redirect("/member/dashboard");
}
