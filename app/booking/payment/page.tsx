import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PaymentPageClient } from "@/components/booking/payment-page-client";
import { createPaymentIntent } from "@/app/booking/payment-actions";
import { bookingIdsSchema } from "@/lib/booking/schema";
import type { BookingStatus } from "@/types/database";

export default async function BookingPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const requestedIds = (ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const parsedIds = bookingIdsSchema.safeParse(requestedIds);
  if (!parsedIds.success) {
    return <StatusMessage title="Booking not found." />;
  }

  const supabase = await createClient();
  const { data: bookings, error } = await supabase.rpc(
    "get_bookings_for_payment",
    { p_booking_ids: parsedIds.data }
  );

  if (error) {
    return (
      <StatusMessage variant="error" title={bookingLookupErrorMessage(error)} />
    );
  }

  // Some requested ids didn't resolve to a real booking (typo'd/tampered
  // URL, or a booking that no longer exists) - treat the whole batch as
  // unpayable rather than silently charging for a subset.
  if (!bookings || bookings.length !== parsedIds.data.length) {
    return <StatusMessage title="We couldn't find that booking." />;
  }

  const notPending = bookings.find((b) => b.status !== "pending");
  if (notPending) {
    return <StatusMessage title={statusMessage(notPending.status)} />;
  }

  // Create the Stripe PaymentIntent on the server during the page render so
  // the client is not stuck on "Preparing payment…" after a second round-trip
  // (especially painful on Vercel cold starts).
  const paymentResult = await createPaymentIntent(parsedIds.data);
  const first = bookings[0];

  // Wallet payment is only offered to signed-in members paying for their own
  // bookings - a guest checkout has no `auth_user_id` to look up a wallet
  // for. `pay_with_wallet` re-verifies ownership server-side regardless;
  // this is purely so a member never sees a "Pay via Wallet" option for a
  // batch that isn't theirs.
  const walletBalance = await getWalletBalanceForOwnBookings(first.customer_phone);

  return (
    <PaymentPageClient
      data={{
        bookings: bookings.map((b) => ({
          id: b.booking_id,
          courtName: b.court_name,
          startIso: b.start_time,
          endIso: b.end_time,
          totalPrice: b.total_price,
        })),
        customerFullName: first.customer_full_name,
        customerPhone: first.customer_phone,
        // The earliest-created booking in the batch is the first the
        // auto-cancel cron will expire, so it's the correct countdown
        // deadline for the whole payment.
        createdAtIso: bookings.reduce(
          (earliest, b) => (b.created_at < earliest ? b.created_at : earliest),
          first.created_at
        ),
      }}
      initialPayment={paymentResult.data ?? null}
      initialPaymentError={paymentResult.error ?? null}
      walletBalance={walletBalance}
    />
  );
}

/**
 * Looks up the signed-in member's wallet balance, but only if these
 * bookings are actually theirs (matched by phone, which is unique on
 * `customers` - `get_bookings_for_payment` doesn't expose `customer_id`).
 * Otherwise a logged-in member who opens a link to someone else's pending
 * booking would see a "Pay via Wallet" option that `pay_with_wallet` would
 * just reject anyway.
 */
async function getWalletBalanceForOwnBookings(
  bookingCustomerPhone: string
): Promise<{ allTimeHours: number; offPeakHours: number } | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return null;
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("phone, wallet_hours_all_time, wallet_hours_off_peak")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (!customer || customer.phone !== bookingCustomerPhone) {
    return null;
  }

  return {
    allTimeHours: customer.wallet_hours_all_time,
    offPeakHours: customer.wallet_hours_off_peak,
  };
}

function statusMessage(status: BookingStatus): string {
  if (status === "confirmed") {
    return "This booking is already confirmed and paid.";
  }
  return "This booking has been cancelled.";
}

function bookingLookupErrorMessage(
  error: { code?: string; message?: string } | null
): string {
  if (!error) {
    return "We couldn't find that booking.";
  }

  // In dev, surface the real RPC/PostgREST message for faster debugging.
  if (process.env.NODE_ENV === "development" && error.message) {
    return error.message;
  }

  return "We couldn't load this booking. Please try again or start a new one.";
}

function StatusMessage({
  title,
  variant = "info",
}: {
  title: string;
  variant?: "info" | "error";
}) {
  const isError = variant === "error";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <CircleAlert
          className={isError ? "size-10 text-destructive" : "size-10 text-muted-foreground"}
        />
        <p
          className={
            isError
              ? "text-lg font-medium text-destructive"
              : "text-lg font-medium"
          }
          role={isError ? "alert" : undefined}
        >
          {title}
        </p>
        <Button nativeButton={false} render={<Link href="/booking" />} className="h-11">
          Back to booking
        </Button>
      </div>
    </div>
  );
}
