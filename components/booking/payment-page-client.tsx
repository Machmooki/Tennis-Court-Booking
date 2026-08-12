"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PaymentPanel } from "@/components/booking/payment-panel";
import {
  createPaymentIntent,
  type PaymentIntentData,
} from "@/app/booking/payment-actions";
import { useCountdownTo } from "@/lib/booking/use-countdown";
import { formatCountdown, formatCurrency, formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PaymentPageBooking {
  id: string;
  totalPrice: number;
  courtName: string;
  startIso: string;
  endIso: string;
  /** Booking creation time - the countdown deadline is always this + 15min,
   * matching the auto-cancel window, never a fresh "start now" timer. */
  createdAtIso: string;
  customerFullName: string;
  customerPhone: string;
}

// Must match the auto-cancel window in
// supabase/migrations/20260811030000_auto_cancel_cron.sql - if that window
// changes, update this too so the countdown doesn't mislead guests.
const PENDING_BOOKING_TTL_MS = 15 * 60 * 1000;

export function PaymentPageClient({ booking }: { booking: PaymentPageBooking }) {
  const [payment, setPayment] = useState<PaymentIntentData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const deadlineMs =
    new Date(booking.createdAtIso).getTime() + PENDING_BOOKING_TTL_MS;
  const secondsLeft = useCountdownTo(deadlineMs);
  const isExpired = secondsLeft <= 0;

  useEffect(() => {
    let cancelled = false;

    void createPaymentIntent(booking.id)
      .then((result) => {
        if (cancelled) return;
        if (!result.data) {
          setLoadError(
            result.error ?? "Could not start payment. Please try again."
          );
          return;
        }
        setLoadError(null);
        setPayment(result.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : "Could not start payment. Please try again."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [booking.id]);

  return (
    <div className="mx-auto w-full max-w-4xl p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Complete your payment
        </h1>
        <p className="text-sm text-muted-foreground">
          Your slot is reserved while you pay.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SummaryCard booking={booking} />

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pay now</CardTitle>
            {!succeeded && (
              <span
                className={cn(
                  "flex items-center gap-1 font-mono text-sm font-medium",
                  isExpired
                    ? "text-destructive"
                    : secondsLeft <= 60
                      ? "text-destructive"
                      : "text-muted-foreground"
                )}
              >
                <Clock className="size-3.5" />
                {formatCountdown(secondsLeft)}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {succeeded ? (
              <SuccessState />
            ) : loadError ? (
              <PaymentLoadError message={loadError} />
            ) : isExpired ? (
              <ExpiredState />
            ) : payment ? (
              <PaymentPanel
                clientSecret={payment.clientSecret}
                amount={payment.amount}
                customerName={booking.customerFullName}
                onSuccess={() => setSucceeded(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                Preparing payment…
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ booking }: { booking: PaymentPageBooking }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SummaryRow label="Name" value={booking.customerFullName} />
        <SummaryRow label="Phone" value={booking.customerPhone} />
        <SummaryRow label="Court" value={booking.courtName} />
        <SummaryRow label="Date" value={formatDate(booking.startIso)} />
        <SummaryRow
          label="Time"
          value={`${formatTime(booking.startIso)} – ${formatTime(booking.endIso)}`}
        />
        <Separator />
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(booking.totalPrice)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <CheckCircle2 className="size-14 text-emerald-500" />
      <p className="text-lg font-semibold">Payment successful!</p>
      <p className="text-sm text-muted-foreground">
        Your booking is confirmed. See you on the court!
      </p>
      <Button
        nativeButton={false}
        render={<Link href="/booking" />}
        className="mt-2 h-11"
      >
        Book another slot
      </Button>
    </div>
  );
}

function PaymentLoadError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-destructive" role="alert">{message}</p>
      <Button
        type="button"
        variant="outline"
        className="mt-2 h-11"
        onClick={() => window.location.reload()}
      >
        Try again
      </Button>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Clock className="size-14 text-destructive" />
      <p className="text-lg font-semibold">Booking expired</p>
      <p className="text-sm text-muted-foreground">
        This reservation window has closed and the slot may have been
        released. Please start a new booking.
      </p>
      <Button
        nativeButton={false}
        render={<Link href="/booking" />}
        variant="outline"
        className="mt-2 h-11"
      >
        Back to booking
      </Button>
    </div>
  );
}
