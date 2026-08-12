import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PaymentPageClient } from "@/components/booking/payment-page-client";
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

  const first = bookings[0];

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
    />
  );
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
