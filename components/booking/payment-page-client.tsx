"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PaymentPanel } from "@/components/booking/payment-panel";
import {
  cancelPendingBookings,
  createPaymentIntent,
  type PaymentIntentData,
} from "@/app/booking/payment-actions";
import { useCountdownTo } from "@/lib/booking/use-countdown";
import { formatCountdown, formatCurrency, formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PaymentPageBookingItem {
  id: string;
  courtName: string;
  startIso: string;
  endIso: string;
  totalPrice: number;
}

export interface PaymentPageData {
  bookings: PaymentPageBookingItem[];
  customerFullName: string;
  customerPhone: string;
  /** Earliest booking's created_at in the batch - the countdown deadline is
   * always this + 15min, since that's the one the auto-cancel cron would
   * expire first. */
  createdAtIso: string;
}

// Must match the auto-cancel window in
// supabase/migrations/20260811030000_auto_cancel_cron.sql - if that window
// changes, update this too so the countdown doesn't mislead guests.
const PENDING_BOOKING_TTL_MS = 15 * 60 * 1000;

export function PaymentPageClient({ data }: { data: PaymentPageData }) {
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentIntentData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [isCancelling, startCancelTransition] = useTransition();

  const bookingIds = useMemo(
    () => data.bookings.map((b) => b.id),
    [data.bookings]
  );
  const totalPrice = useMemo(
    () => data.bookings.reduce((sum, b) => sum + b.totalPrice, 0),
    [data.bookings]
  );

  const deadlineMs =
    new Date(data.createdAtIso).getTime() + PENDING_BOOKING_TTL_MS;
  const secondsLeft = useCountdownTo(deadlineMs);
  const isExpired = secondsLeft <= 0;
  const canCancel = !succeeded && !isExpired;

  useEffect(() => {
    let cancelled = false;

    void createPaymentIntent(bookingIds)
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
  }, [bookingIds]);

  function handleCancel() {
    if (!canCancel || isCancelling) return;

    startCancelTransition(async () => {
      const result = await cancelPendingBookings(bookingIds);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Booking cancelled successfully");
      router.push("/booking");
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Complete your payment
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.bookings.length === 1
            ? "Your slot is reserved while you pay."
            : `Your ${data.bookings.length} slots are reserved while you pay.`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SummaryCard data={data} totalPrice={totalPrice} />

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
          <CardContent className="space-y-4">
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
                customerName={data.customerFullName}
                onSuccess={() => setSucceeded(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                Preparing payment…
              </div>
            )}

            {canCancel && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive"
                disabled={isCancelling}
                onClick={handleCancel}
              >
                {isCancelling && <Loader2 className="size-4 animate-spin" />}
                {isCancelling ? "Cancelling…" : "Cancel Booking"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Groups bookings by court so a multi-slot batch shows e.g. "Court A" with
 * its slots listed underneath, instead of a flat repeating list of rows. */
function groupByCourt(
  bookings: PaymentPageBookingItem[]
): { courtName: string; slots: PaymentPageBookingItem[] }[] {
  const groups = new Map<string, PaymentPageBookingItem[]>();
  for (const booking of bookings) {
    const existing = groups.get(booking.courtName);
    if (existing) {
      existing.push(booking);
    } else {
      groups.set(booking.courtName, [booking]);
    }
  }
  return Array.from(groups.entries()).map(([courtName, slots]) => ({
    courtName,
    slots,
  }));
}

function SummaryCard({
  data,
  totalPrice,
}: {
  data: PaymentPageData;
  totalPrice: number;
}) {
  const groups = groupByCourt(data.bookings);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SummaryRow label="Name" value={data.customerFullName} />
        <SummaryRow label="Phone" value={data.customerPhone} />

        <Separator />

        {groups.map((group) => {
          const groupTotal = group.slots.reduce(
            (sum, s) => sum + s.totalPrice,
            0
          );
          return (
            <div key={group.courtName} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {group.courtName} ·{" "}
                  {group.slots.length === 1
                    ? "1 slot"
                    : `${group.slots.length} slots`}
                </span>
                <span className="font-medium">
                  {formatCurrency(groupTotal)}
                </span>
              </div>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {group.slots.map((slot) => (
                  <li key={slot.id}>
                    {formatDate(slot.startIso)}, {formatTime(slot.startIso)} –{" "}
                    {formatTime(slot.endIso)}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <Separator />

        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(totalPrice)}</span>
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
