"use server";

import Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

const paymentIntentSchema = z.object({
  bookingId: z.string().uuid("Invalid booking reference."),
});

export interface PaymentIntentData {
  clientSecret: string;
  /** Decimal THB amount (not satang) - for display via `formatCurrency`. */
  amount: number;
}

export type CreatePaymentIntentResult =
  | { error: string; data?: undefined }
  | { error?: undefined; data: PaymentIntentData };

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
 * Starts payment for an existing pending booking by creating a Stripe
 * PaymentIntent for PromptPay + card, and returning its `client_secret` so
 * the client can render an embedded `<PaymentElement>` - no redirect to a
 * Stripe-hosted page for PromptPay. Never trusts a client-supplied amount:
 * `create_payment_intent` validates the booking is still pending and returns
 * the real, server-computed `total_price` locked in when the booking was
 * created.
 */
export async function createPaymentIntent(
  bookingId: string
): Promise<CreatePaymentIntentResult> {
  const parsed = paymentIntentSchema.safeParse({ bookingId });
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
  const { data: booking, error } = await supabase
    .rpc("create_payment_intent", { p_booking_id: parsed.data.bookingId })
    .single();

  if (error) {
    return { error: error.message };
  }
  if (!booking) {
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
  const amountSatang = Math.round(booking.total_price * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountSatang,
      currency: "thb",
      // PromptPay (QR) + card so `<PaymentElement>` shows both tabs.
      payment_method_types: ["promptpay", "card"],
      description: `${booking.court_name} court booking, ${formatDateTime(
        booking.start_time
      )} – ${formatDateTime(booking.end_time)}`,
      // Trusted, tamper-proof link back to our booking: the webhook only
      // ever reads this out of Stripe's *signed* event payload, never from
      // client input.
      metadata: {
        booking_id: parsed.data.bookingId,
      },
    });

    if (!paymentIntent.client_secret) {
      return { error: "Stripe did not return a client secret." };
    }

    return {
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: booking.total_price,
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
