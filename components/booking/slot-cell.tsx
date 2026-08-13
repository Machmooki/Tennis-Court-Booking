"use client";

import { cn } from "@/lib/utils";

export type SlotStatus = "available" | "selected" | "booked" | "past";

interface SlotCellProps {
  status: SlotStatus;
  label: string;
  onSelect: () => void;
  ariaLabel: string;
}

export function SlotCell({ status, label, onSelect, ariaLabel }: SlotCellProps) {
  const disabled = status === "booked" || status === "past";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={status === "selected"}
      aria-label={ariaLabel}
      className={cn(
        "min-h-11 w-full rounded-full border px-4 py-3 text-center text-sm font-medium transition-all duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        status === "available" &&
          "border-border bg-background text-foreground hover:border-primary hover:shadow-sm",
        status === "selected" &&
          "border-primary bg-primary text-primary-foreground shadow-md",
        status === "booked" &&
          "cursor-not-allowed border-transparent bg-muted/40 text-muted-foreground opacity-50",
        status === "past" &&
          "cursor-not-allowed border-transparent bg-muted/40 text-muted-foreground opacity-50"
      )}
    >
      {label}
    </button>
  );
}
