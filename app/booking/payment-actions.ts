"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { bookingIdsSchema } from "@/lib/booking/schema";

export interface PaymentIntentData {
  clientSecret: string;
  /** Decimal THB amount (not satang) - for display via `formatCurrency`. */
  amount: number;
}

export type CreatePaymentIntentResult =
  | { error: string; data?: undefined }
  | { error?: undefined; data: PaymentIntentData };

export type CancelPendingBookingsResult =
  | { error: string; cancelledCount?: undefined }
  | { error?: undefined; cancelledCount: number };

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Add it to .env.local and restart the dev server."
    );
  }
  return new Stripe(secretKey);
}

/**
 * Starts payment for a batch of pending bookings (one checkout can select
 * multiple slots) by creating a single Stripe PaymentIntent for PromptPay +
 * card, and returning its `client_secret` so the client can render an
 * embedded `<PaymentElement>` - no redirect to a Stripe-hosted page for
 * PromptPay. Never trusts a client-supplied amount: `create_payment_intent`
 * validates every booking is still pending and belongs to the same
 * customer, and returns the real, server-computed combined `total_price`.
 */
export async function createPaymentIntent(
  bookingIds: string[]
): Promise<CreatePaymentIntentResult> {
  const parsed = bookingIdsSchema.safeParse(bookingIds);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid booking." };
  }

  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!publishableKey) {
    console.error(
      "[createPaymentIntent] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or empty."
    );
    return {
      error:
        "Payments are not configured (missing Stripe publishable key). Please contact the club.",
    };
  }

  const supabase = await createClient();
  const { data: batch, error } = await supabase
    .rpc("create_payment_intent", { p_booking_ids: parsed.data })
    .single();

  if (error) {
    return { error: error.message };
  }
  if (!batch) {
    return { error: "Booking not found." };
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (configError) {
    console.error("[createPaymentIntent] Stripe not configured:", configError);
    return {
      error: "Payments are temporarily unavailable. Please try again later.",
    };
  }

  // Stripe wants an integer in the currency's minor unit. THB is not a
  // zero-decimal currency in Stripe's accounting (unlike e.g. JPY) - its
  // minor unit is satang, 100 of which make 1 baht - so the same *100
  // conversion used for e.g. USD cents applies here too.
  const amountSatang = Math.round(batch.total_price * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountSatang,
      currency: "thb",
      // PromptPay (QR) + card so `<PaymentElement>` shows both tabs.
      payment_method_types: ["promptpay", "card"],
      description: batch.description ?? undefined,
      // Trusted, tamper-proof link back to our bookings: the webhook only
      // ever reads this out of Stripe's *signed* event payload, never from
      // client input. Joined as a string since Stripe metadata values must
      // be strings (max 500 chars - comfortably fits the 10-booking cap
      // enforced by `bookingIdsSchema`/`create_payment_intent`).
      metadata: {
        booking_ids: parsed.data.join(","),
      },
    });

    if (!paymentIntent.client_secret) {
      return { error: "Stripe did not return a client secret." };
    }

    return {
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: batch.total_price,
      },
    };
  } catch (stripeError) {
    console.error(
      "[createPaymentIntent] Stripe PaymentIntent creation failed:",
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

/**
 * Releases still-pending bookings immediately from the payment page so the
 * guest does not have to wait for the 15-minute auto-cancel cron. Guests
 * have no direct UPDATE policy on `bookings`, so this goes through the
 * `cancel_pending_bookings` security-definer RPC (booking ids act as the
 * capability token, same as `get_bookings_for_payment`). Confirmed/paid
 * rows are never touched.
 */
export async function cancelPendingBookings(
  bookingIds: string[]
): Promise<CancelPendingBookingsResult> {
  const parsed = bookingIdsSchema.safeParse(bookingIds);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid booking." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("cancel_pending_bookings", { p_booking_ids: parsed.data })
    .single();

  if (error) {
    return { error: error.message };
  }

  return { cancelledCount: data?.cancelled_count ?? 0 };
}
