"use server";

import { z } from "zod";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export interface PackagePaymentIntentData {
  clientSecret: string;
  paymentIntentId: string;
  /** Decimal THB amount (not satang) - for display via `formatCurrency`. */
  amount: number;
  packageName: string;
  creditHours: number;
}

export type CreatePackagePaymentIntentResult =
  | { error: string; data?: undefined }
  | { error?: undefined; data: PackagePaymentIntentData };

const packageIdSchema = z.string().uuid("Invalid package.");

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Add it to .env.local / Vercel env and restart."
    );
  }
  return new Stripe(secretKey);
}

/**
 * Starts Stripe payment for an active credit package on behalf of the
 * signed-in member. Never trusts a client-supplied price: the amount is
 * always read from `packages.price_thb`. Metadata tags the PaymentIntent as
 * a package top-up so the webhook can route to `confirm_package_topup`
 * instead of `confirm_booking_payment`.
 */
export async function createPackagePaymentIntent(
  packageId: string
): Promise<CreatePackagePaymentIntentResult> {
  const parsed = packageIdSchema.safeParse(packageId);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid package." };
  }

  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!publishableKey) {
    console.error(
      "[createPackagePaymentIntent] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or empty."
    );
    return {
      error:
        "Payments are not configured (missing Stripe publishable key). Please contact the club.",
    };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { error: "You must be signed in to buy a package." };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (customerError) {
    return { error: customerError.message };
  }
  if (!customer) {
    return {
      error:
        "We could not find your member profile. Please contact the club to link your account.",
    };
  }

  const { data: pkg, error: packageError } = await supabase
    .from("packages")
    .select("id, name, price_thb, credit_hours, is_active")
    .eq("id", parsed.data)
    .maybeSingle();

  if (packageError) {
    return { error: packageError.message };
  }
  if (!pkg || !pkg.is_active) {
    return { error: "This package is not available for purchase." };
  }
  if (pkg.price_thb <= 0) {
    return { error: "This package has an invalid price." };
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (configError) {
    console.error(
      "[createPackagePaymentIntent] Stripe not configured:",
      configError
    );
    return {
      error: "Payments are temporarily unavailable. Please try again later.",
    };
  }

  // Stripe expects THB in satang (integer minor units).
  const amountSatang = Math.round(pkg.price_thb * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountSatang,
      currency: "thb",
      payment_method_types: ["promptpay", "card"],
      description: `${pkg.name} (${pkg.credit_hours} hours)`,
      // Trusted, tamper-proof routing for the webhook: `type` distinguishes
      // package top-ups from booking payments; customer_id/package_id are
      // never read from the client request on confirmation.
      metadata: {
        type: "package_topup",
        customer_id: customer.id,
        package_id: pkg.id,
      },
    });

    if (!paymentIntent.client_secret) {
      return { error: "Stripe did not return a client secret." };
    }

    return {
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: pkg.price_thb,
        packageName: pkg.name,
        creditHours: pkg.credit_hours,
      },
    };
  } catch (stripeError) {
    console.error(
      "[createPackagePaymentIntent] Stripe PaymentIntent creation failed:",
      stripeError
    );
    return {
      error:
        stripeError instanceof Error
          ? stripeError.message
          : "Failed to start payment. Please try again.",
    };
  }
}
