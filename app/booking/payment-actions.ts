"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { bookingIdsSchema } from "@/lib/booking/schema";

export interface PaymentIntentData {
  clientSecret: string;
  paymentIntentId: string;
  /** Decimal THB amount (not satang) - for display via `formatCurrency`. */
  amount: number;
}

export type CreatePaymentIntentResult =
  | { error: string; data?: undefined }
  | { error?: undefined; data: PaymentIntentData };

export type CancelPendingBookingsResult =
  | { error: string; cancelledCount?: undefined }
  | { error?: undefined; cancelledCount: number };

export type FinalizePaidBookingsResult =
  | { error: string }
  | { error?: undefined; bookingIds: string[] };

export interface PayWithWalletData {
  bookingIds: string[];
  hoursDeductedAllTime: number;
  hoursDeductedOffPeak: number;
}

export type PayWithWalletResult =
  | { error: string; data?: undefined }
  | { error?: undefined; data: PayWithWalletData };

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
        paymentIntentId: paymentIntent.id,
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
 * Confirms pending bookings after the browser sees a succeeded PaymentIntent.
 * Required on Vercel/production when the Stripe Dashboard webhook is missing
 * or delayed - `stripe listen` only forwards events to localhost.
 *
 * Never trusts the client alone: re-fetches the PaymentIntent from Stripe,
 * checks `status === succeeded`, and verifies metadata booking ids match
 * before calling `confirm_booking_payment` with the service role.
 */
export async function finalizePaidBookings(
  paymentIntentId: string,
  bookingIds: string[]
): Promise<FinalizePaidBookingsResult> {
  const trimmedIntentId = paymentIntentId.trim();
  if (!trimmedIntentId.startsWith("pi_")) {
    return { error: "Invalid payment reference." };
  }

  const parsed = bookingIdsSchema.safeParse(bookingIds);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid booking." };
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch {
    return { error: "Payments are temporarily unavailable." };
  }

  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(trimmedIntentId);
  } catch (retrieveError) {
    console.error(
      "[finalizePaidBookings] Stripe retrieve failed:",
      retrieveError
    );
    return { error: "Could not verify payment with Stripe." };
  }

  if (paymentIntent.status !== "succeeded") {
    return { error: "Payment is not complete yet." };
  }

  const metadataIds = (paymentIntent.metadata?.booking_ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .sort();
  const requestedIds = [...parsed.data].sort();

  if (
    metadataIds.length !== requestedIds.length ||
    metadataIds.some((id, index) => id !== requestedIds[index])
  ) {
    console.error(
      "[finalizePaidBookings] booking_ids mismatch:",
      { paymentIntentId: trimmedIntentId, metadataIds, requestedIds }
    );
    return { error: "Payment does not match these bookings." };
  }

  const providerReference =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.id;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .rpc("confirm_booking_payment", {
      p_booking_ids: parsed.data,
      p_payment_intent_id: paymentIntent.id,
      p_provider_reference: providerReference,
    })
    .single();

  if (error) {
    console.error(
      "[finalizePaidBookings] confirm_booking_payment failed:",
      error.message
    );
    return { error: error.message };
  }

  return { bookingIds: data?.booking_ids ?? parsed.data };
}

/**
 * Pays for the signed-in member's own pending bookings out of their hour
 * wallet instead of Stripe. All validation (enough balance, bookings still
 * pending, bookings actually belong to this member) and the deduct + confirm
 * mutation happen atomically inside the `pay_with_wallet` RPC - this action
 * is just a thin, typed wrapper plus input validation.
 */
export async function payWithWallet(
  bookingIds: string[]
): Promise<PayWithWalletResult> {
  const parsed = bookingIdsSchema.safeParse(bookingIds);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid booking." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("pay_with_wallet", { p_booking_ids: parsed.data })
    .single();

  if (error) {
    console.error("[payWithWallet] pay_with_wallet RPC failed:", error.message);
    return { error: error.message };
  }
  if (!data) {
    return { error: "Payment failed. Please try again." };
  }

  return {
    data: {
      bookingIds: data.booking_ids,
      hoursDeductedAllTime: data.hours_deducted_all_time,
      hoursDeductedOffPeak: data.hours_deducted_off_peak,
    },
  };
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
