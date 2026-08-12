"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createGuestBookings } from "@/app/booking/actions";
import { guestCheckoutSchema } from "@/lib/booking/schema";
import { useBookingStore } from "@/lib/booking/store";
import { formatCurrency, formatTime } from "@/lib/format";

/**
 * Collects guest name/phone, creates the pending booking(s) via
 * `process_guest_booking`, then hands off to the dedicated
 * `/booking/payment/[id]` page. This dialog deliberately never touches
 * Stripe or renders payment UI - a prior single-dialog design that swapped
 * in embedded Stripe Elements content here caused persistent Base UI modal
 * focus/dismiss issues. A full page navigation for payment is far more
 * stable.
 */
export function CheckoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const selectedSlots = useBookingStore((s) => s.selectedSlots);
  const removeSlot = useBookingStore((s) => s.removeSlot);
  const totalPrice = useBookingStore((s) => s.totalPrice());
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setError(null);
      setIsRedirecting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedSlots.length === 0) return;

    const formData = new FormData(event.currentTarget);
    const parsed = guestCheckoutSchema.safeParse({
      full_name: formData.get("full_name"),
      phone: formData.get("phone"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    formData.set(
      "slots",
      JSON.stringify(
        selectedSlots.map((slot) => ({
          courtId: slot.courtId,
          startIso: slot.startIso,
        }))
      )
    );

    startTransition(async () => {
      const result = await createGuestBookings({ results: [] }, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      const results = result.results ?? [];
      const succeeded = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      // Only clear the slots that actually succeeded; keep failed ones
      // selected so the guest can see what happened and retry or drop them.
      for (const success of succeeded) {
        removeSlot(success.courtId, success.startIso);
      }

      for (const failure of failed) {
        const slot = selectedSlots.find(
          (s) => s.courtId === failure.courtId && s.startIso === failure.startIso
        );
        const label = slot
          ? `${slot.courtName} at ${formatTime(slot.startIso)}`
          : "A slot";

        if (failure.errorType === "anti_spam") {
          toast.error("You have too many unpaid bookings.", {
            description:
              "Complete or cancel a pending booking before adding more.",
          });
        } else if (failure.errorType === "conflict") {
          toast.error(`${label} was just booked by someone else.`);
        } else {
          toast.error(failure.error ?? `${label} could not be booked.`);
        }
      }

      if (succeeded.length === 0) {
        return;
      }

      setError(null);
      const [firstSuccess, ...restSuccesses] = succeeded;

      // Payment is a single-booking flow, so only the first successful slot
      // is paid for right now. Any extra slots stay reserved (pending) and
      // can be paid for in a follow-up visit.
      if (restSuccesses.length > 0) {
        toast.info(
          `You'll need to pay for ${restSuccesses.length} more slot${
            restSuccesses.length === 1 ? "" : "s"
          } separately.`
        );
      }

      if (firstSuccess?.bookingId) {
        setIsRedirecting(true);
        router.push(`/booking/payment/${firstSuccess.bookingId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Confirm your booking</DialogTitle>
            <DialogDescription>
              We just need your name and phone number. No account needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Selected slots
              </p>
              <ul className="space-y-1 text-sm">
                {selectedSlots.map((slot) => (
                  <li
                    key={`${slot.courtId}-${slot.startIso}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      {slot.courtName} · {formatTime(slot.startIso)}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(slot.price)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t pt-1.5 text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                autoComplete="name"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="+1 555 123 4567"
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                isPending || isRedirecting || selectedSlots.length === 0
              }
              className="h-11 w-full"
            >
              {isRedirecting
                ? "Redirecting to payment…"
                : isPending
                  ? "Booking…"
                  : `Book ${selectedSlots.length} slot${
                      selectedSlots.length === 1 ? "" : "s"
                    } · ${formatCurrency(totalPrice)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
