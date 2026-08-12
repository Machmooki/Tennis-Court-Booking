import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { bookingIdsSchema } from "@/lib/booking/schema";

// App Router Route Handlers, unlike the old Pages Router API routes, never
// auto-parse the request body - `await request.text()` below already
// yields the exact raw bytes Stripe signed, so no `bodyParser: false` /
// `api.externalResolver` style config is needed here. Being explicit about
// the Node runtime just guards against ever accidentally opting into Edge,
// where Stripe's SDK (and its Node `crypto` dependency) isn't supported.
export const runtime = "nodejs";

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }
  return new Stripe(secretKey);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook/payment] STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.warn("[webhook/payment] rejected: missing stripe-signature header.");
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Read the raw body BEFORE any JSON parsing - `constructEvent` re-hashes
  // these exact bytes to verify the signature, so parsing (or even
  // re-serializing) first would break verification.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (verificationError) {
    console.warn(
      "[webhook/payment] rejected: signature verification failed:",
      verificationError instanceof Error
        ? verificationError.message
        : verificationError
    );
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  console.log(`[webhook/payment] received: ${event.type} (${event.id})`);

  if (event.type !== "payment_intent.succeeded") {
    // Acknowledge every other subscribed event type so Stripe doesn't
    // retry it - we simply don't act on it.
    return NextResponse.json({ received: true });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const bookingIdsRaw = paymentIntent.metadata?.booking_ids ?? "";
  const bookingIdsResult = bookingIdsSchema.safeParse(
    bookingIdsRaw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
  const paymentIntentId = paymentIntent.id;
  // The charge id (when available) is a more specific provider reference
  // than the intent id for the `transactions` audit trail; not expanding
  // it above means it's a plain string id here, not a nested object.
  const providerReference =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntentId;

  console.log("[webhook/payment] payment_intent.succeeded metadata:", {
    paymentIntentId,
    bookingIds: bookingIdsRaw,
    providerReference,
  });

  if (!bookingIdsResult.success) {
    // Malformed event from our own integration (metadata we set ourselves
    // when creating the PaymentIntent) - not something a retry will fix,
    // but log loudly since it means a payment succeeded with no way to
    // match it.
    console.error(
      "[webhook/payment] payment_intent.succeeded missing/invalid booking_ids metadata:",
      { paymentIntentId, metadata: paymentIntent.metadata }
    );
    return NextResponse.json({ received: true });
  }

  // Everything below this line must stay minimal: return 200 immediately
  // after the DB mutation, not after any slow side effects (confirmation
  // emails/SMS, etc.) - those should be queued/fired asynchronously
  // elsewhere, never awaited here.
  console.log(
    `[webhook/payment] calling confirm_booking_payment for bookings [${bookingIdsResult.data.join(", ")}] (service role)`
  );
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .rpc("confirm_booking_payment", {
      p_booking_ids: bookingIdsResult.data,
      p_payment_intent_id: paymentIntentId,
      p_provider_reference: providerReference,
    })
    .single();

  if (error) {
    // `confirm_booking_payment` already treats "already confirmed" as an
    // idempotent no-op, so a thrown error here means something genuinely
    // went wrong (e.g. the booking expired via auto-cancel before payment
    // completed) - worth a 500 so Stripe retries and this surfaces in logs.
    console.error("[webhook/payment] confirm_booking_payment failed:", error.message);
    // PGRST202 = PostgREST can't find that function signature in its schema
    // cache - almost always means the migration defining/renaming it was
    // never actually run against this Supabase project (as opposed to a
    // bug in this route), so call that out explicitly to save a debugging
    // detour next time.
    if (error.code === "PGRST202") {
      console.error(
        "[webhook/payment] hint: 'confirm_booking_payment' is missing from the DB schema cache - " +
          "run the latest supabase/migrations/*.sql against your project (SQL editor or `supabase db push`), " +
          "then NOTIFY pgrst, 'reload schema' if it still doesn't pick up."
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.info(
    `[webhook/payment] confirmed bookings [${data?.booking_ids?.join(", ")}] via payment intent ${paymentIntentId}.`
  );
  return NextResponse.json({ received: true, bookingIds: data?.booking_ids });
}
