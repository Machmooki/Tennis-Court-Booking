import Link from "next/link";
import { z } from "zod";
import { CircleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PaymentPageClient } from "@/components/booking/payment-page-client";
import type { BookingStatus } from "@/types/database";

const bookingIdSchema = z.string().uuid();

export default async function BookingPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = bookingIdSchema.safeParse(id);

  if (!parsedId.success) {
    return <StatusMessage title="Booking not found." />;
  }

  const supabase = await createClient();
  const { data: booking, error } = await supabase
    .rpc("get_booking_for_payment", { p_booking_id: parsedId.data })
    .single();

  if (error || !booking) {
    return (
      <StatusMessage
        variant="error"
        title={bookingLookupErrorMessage(error)}
      />
    );
  }

  if (booking.status !== "pending") {
    return <StatusMessage title={statusMessage(booking.status)} />;
  }

  return (
    <PaymentPageClient
      booking={{
        id: parsedId.data,
        totalPrice: booking.total_price,
        courtName: booking.court_name,
        startIso: booking.start_time,
        endIso: booking.end_time,
        createdAtIso: booking.created_at,
        customerFullName: booking.customer_full_name,
        customerPhone: booking.customer_phone,
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

  // PostgREST `.single()` when the RPC returns zero rows.
  if (error.code === "PGRST116") {
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
