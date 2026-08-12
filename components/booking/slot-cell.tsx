"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

export type SlotStatus = "available" | "selected" | "booked" | "past";

interface SlotCellProps {
  status: SlotStatus;
  price: number;
  onSelect: () => void;
  ariaLabel: string;
}

// h-11/w-full keeps every tap target at least 44px tall, and the grid's
// column width (see SlotGrid) keeps it comfortably wider than 44px too.
export function SlotCell({ status, price, onSelect, ariaLabel }: SlotCellProps) {
  const disabled = status === "booked" || status === "past";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={status === "selected"}
      aria-label={ariaLabel}
      className={cn(
        "flex h-11 w-full flex-col items-center justify-center rounded-md border text-[11px] font-medium leading-tight transition-colors",
        status === "available" &&
          "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5",
        status === "selected" &&
          "border-primary bg-primary text-primary-foreground",
        status === "booked" &&
          "cursor-not-allowed border-transparent bg-muted text-muted-foreground",
        status === "past" &&
          "cursor-not-allowed border-transparent bg-muted/50 text-muted-foreground/50"
      )}
    >
      {status === "booked" ? "Booked" : formatCurrency(price)}
    </button>
  );
}
