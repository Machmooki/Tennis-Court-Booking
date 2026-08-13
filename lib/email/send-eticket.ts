import "server-only";

import { createElement } from "react";
import { Resend } from "resend";
import Stripe from "stripe";
import { ETicketEmail } from "@/components/email/e-ticket";
import { formatDate, formatTime } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/service";

const DEFAULT_FROM = "Tennis Booking <onboarding@resend.dev>";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      "[send-eticket] RESEND_API_KEY is not configured - skipping E-Ticket email."
    );
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Best-effort extraction of the guest email collected by Stripe Elements
 * (billing details / receipt email on the PaymentIntent or its Charge).
 */
export async function extractStripeCustomerEmail(
  paymentIntent: Stripe.PaymentIntent,
  stripe: Stripe
): Promise<string | null> {
  if (paymentIntent.receipt_email) {
    return paymentIntent.receipt_email.trim() || null;
  }

  const latestCharge = paymentIntent.latest_charge;
  if (latestCharge && typeof latestCharge !== "string") {
    const email = latestCharge.billing_details?.email?.trim();
    if (email) return email;
  }

  if (typeof latestCharge === "string") {
    try {
      const charge = await stripe.charges.retrieve(latestCharge);
      const email = charge.billing_details?.email?.trim();
      if (email) return email;
      if (charge.receipt_email?.trim()) return charge.receipt_email.trim();
    } catch (retrieveError) {
      console.warn(
        "[send-eticket] could not retrieve charge for email:",
        retrieveError instanceof Error
          ? retrieveError.message
          : retrieveError
      );
    }
  }

  return null;
}

type BookingTicketRow = {
  id: string;
  start_time: string;
  end_time: string;
  courts: { name: string } | null;
  customers: { full_name: string } | null;
};

/**
 * Sends a confirmed-booking E-Ticket via Resend. Safe to call from a
 * Next.js `after()` callback - never throws to the caller; logs failures.
 */
export async function sendBookingETicket(params: {
  bookingIds: string[];
  paymentIntent: Stripe.PaymentIntent;
  stripe: Stripe;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  const to = await extractStripeCustomerEmail(
    params.paymentIntent,
    params.stripe
  );
  if (!to) {
    console.warn(
      "[send-eticket] no customer email on PaymentIntent - skipping E-Ticket.",
      { paymentIntentId: params.paymentIntent.id }
    );
    return;
  }

  // Service role bypasses RLS; query joins directly instead of the
  // guest-facing `get_bookings_for_payment` RPC (which is not granted to
  // service_role).
  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("bookings")
    .select(
      "id, start_time, end_time, courts ( name ), customers ( full_name )"
    )
    .in("id", params.bookingIds)
    .order("start_time", { ascending: true });

  if (error) {
    console.error(
      "[send-eticket] failed to load bookings for email:",
      error.message
    );
    return;
  }

  const ticketRows = (rows ?? []) as BookingTicketRow[];
  if (ticketRows.length === 0) {
    console.warn("[send-eticket] no booking rows found for E-Ticket.", {
      bookingIds: params.bookingIds,
    });
    return;
  }

  const customerName = ticketRows[0].customers?.full_name ?? "Guest";
  const bookings = ticketRows.map((row) => ({
    bookingId: row.id,
    courtName: row.courts?.name ?? "Court",
    date: formatDate(row.start_time),
    timeRange: `${formatTime(row.start_time)} – ${formatTime(row.end_time)}`,
  }));

  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const subject =
    bookings.length === 1
      ? `Booking confirmed – ${bookings[0].courtName}`
      : `Booking confirmed – ${bookings.length} courts`;

  const { error: sendError } = await resend.emails.send({
    from,
    to: [to],
    subject,
    // React element for Resend's `@react-email/render` pipeline.
    // `createElement` keeps this module as `.ts` (no JSX transform needed).
    react: createElement(ETicketEmail, { customerName, bookings }),
  });

  if (sendError) {
    console.error("[send-eticket] Resend error:", sendError);
    return;
  }

  console.info(
    `[send-eticket] E-Ticket sent to ${to} for bookings [${params.bookingIds.join(", ")}].`
  );
}
