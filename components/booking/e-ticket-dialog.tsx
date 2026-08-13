"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ETicketCard,
  type ETicketCardProps,
} from "@/components/booking/e-ticket-card";

export function ETicketDialog({
  ticket,
  tickets,
  open,
  onOpenChange,
}: {
  ticket?: ETicketCardProps | null;
  tickets?: ETicketCardProps[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const list = tickets ?? (ticket ? [ticket] : []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] max-h-[90vh] overflow-y-auto rounded-3xl p-3 sm:max-w-md sm:p-4">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {list.length > 1 ? "E-Tickets" : "E-Ticket"}
          </DialogTitle>
          <DialogDescription>
            Confirmed booking ticket
            {list.length > 1 ? "s" : ""} for{" "}
            {list[0]?.courtName ?? "this court"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {list.map((item) => (
            <ETicketCard key={item.bookingId} {...item} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
