"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckoutDialog } from "@/components/booking/checkout-dialog";
import { useBookingStore } from "@/lib/booking/store";
import { formatCurrency } from "@/lib/format";

export function CheckoutBar() {
  const selectedSlots = useBookingStore((s) => s.selectedSlots);
  const totalPrice = useBookingStore((s) => s.totalPrice());
  const [open, setOpen] = useState(false);

  if (selectedSlots.length === 0) return null;

  return (
    <>
      <div className="sticky bottom-0 left-0 z-20 w-full border-t bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-semibold">
              {selectedSlots.length} slot{selectedSlots.length === 1 ? "" : "s"}{" "}
              selected
            </p>
            <p className="text-muted-foreground">
              {formatCurrency(totalPrice)} total
            </p>
          </div>
          <Button className="h-11" onClick={() => setOpen(true)}>
            Book now
          </Button>
        </div>
      </div>

      <CheckoutDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
