"use client";

import { useState, useTransition } from "react";
import { Loader2, Ticket, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ETicketDialog } from "@/components/booking/e-ticket-dialog";
import { buildETicketCardProps } from "@/components/booking/e-ticket-card";
import { cancelAdminBooking } from "@/app/admin/bookings/actions";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { BookingStatus } from "@/types/database";

export interface SlotDetailsTarget {
  bookingId: string;
  courtName: string;
  timeLabel: string;
  startIso: string;
  endIso: string;
  createdAtIso: string;
  status: BookingStatus;
  totalPrice: number;
  note: string | null;
  customerName: string | null;
  customerPhone: string | null;
}

const STATUS_VARIANT: Record<
  BookingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
  blocked: "outline",
};

function toTicket(target: SlotDetailsTarget) {
  return buildETicketCardProps({
    bookingId: target.bookingId,
    customerName: target.customerName ?? "Guest",
    customerPhone: target.customerPhone ?? "—",
    courtName: target.courtName,
    startIso: target.startIso,
    endIso: target.endIso,
    createdAtIso: target.createdAtIso,
    price: target.totalPrice,
    status: target.status,
  });
}

export function SlotDetailsDialog({
  target,
  onOpenChange,
  onSuccess,
}: {
  target: SlotDetailsTarget | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isBlocked = target?.status === "blocked";
  const canViewTicket = target?.status === "confirmed";

  function handleFreeSlot() {
    if (!target) return;

    startTransition(async () => {
      const result = await cancelAdminBooking(target.bookingId);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      toast.success(
        isBlocked
          ? `Unblocked ${target.courtName} at ${target.timeLabel}.`
          : `Cancelled the booking for ${target.courtName} at ${target.timeLabel}.`
      );
      onSuccess();
    });
  }

  return (
    <>
      <Dialog
        open={target !== null}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen);
          if (!nextOpen) {
            setTicketOpen(false);
            setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          {target && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {target.courtName} — {target.timeLabel}
                  <Badge variant={STATUS_VARIANT[target.status]}>
                    {target.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {isBlocked
                    ? "This slot is blocked and unavailable for booking."
                    : "Booking details for this slot."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-1 text-sm">
                {isBlocked ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Reason
                    </p>
                    <p>{target.note?.trim() || "No reason provided."}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-medium">
                        {target.customerName ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">
                        {target.customerPhone ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-medium">
                        {formatCurrency(target.totalPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Booked on</span>
                      <span className="font-medium">
                        {formatDateTime(target.createdAtIso)}
                      </span>
                    </div>
                    {target.note && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Note
                        </p>
                        <p>{target.note}</p>
                      </div>
                    )}
                  </>
                )}

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-col">
                {canViewTicket && (
                  <Button
                    type="button"
                    className="h-11 w-full gap-2 rounded-full"
                    onClick={() => setTicketOpen(true)}
                  >
                    <Ticket className="size-4" />
                    View E-Ticket
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={handleFreeSlot}
                  className="h-11 w-full gap-2"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  {isPending
                    ? "Working…"
                    : isBlocked
                      ? "Unblock slot"
                      : "Cancel booking"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ETicketDialog
        ticket={target && canViewTicket ? toTicket(target) : null}
        open={ticketOpen}
        onOpenChange={setTicketOpen}
      />
    </>
  );
}
