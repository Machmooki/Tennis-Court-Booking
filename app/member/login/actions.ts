"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { memberSignInSchema } from "@/lib/member/schema";

export type SignInMemberResult = { error: string } | { error?: undefined };

const formSchema = memberSignInSchema.extend({
  redirectTo: z.string().startsWith("/").default("/member/dashboard"),
});

function mapAuthError(error: {
  message: string;
  code?: string;
}): string {
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message.toLowerCase();

  if (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed")
  ) {
    return "Please confirm your email before signing in - check your inbox for the confirmation link.";
  }

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  ) {
    return "Invalid email or password.";
  }

  return error.message || "Unable to sign in. Please try again.";
}

export async function signInMember(
  _prevState: SignInMemberResult,
  formData: FormData
): Promise<SignInMemberResult> {
  const parsed = formSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") || "/member/dashboard",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error("[signInMember] Supabase auth error:", {
      name: error.name,
      message: error.message,
      code: error.code,
    });
    return { error: mapAuthError(error) };
  }

  redirect(parsed.data.redirectTo);
}
