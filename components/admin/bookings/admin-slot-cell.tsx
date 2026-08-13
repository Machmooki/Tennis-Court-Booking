"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

export type AdminSlotStatus =
  | "empty"
  | "past"
  | "pending"
  | "confirmed"
  | "blocked";

interface AdminSlotCellProps {
  status: AdminSlotStatus;
  price: number;
  primaryLabel?: string | null;
  onClick: () => void;
  ariaLabel: string;
}

// h-11 keeps every tap target at least 44px tall for admins on tablets, same
// rule as the customer-facing <SlotCell>.
export function AdminSlotCell({
  status,
  price,
  primaryLabel,
  onClick,
  ariaLabel,
}: AdminSlotCellProps) {
  const disabled = status === "past";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-md border px-1 text-[11px] font-medium leading-tight transition-colors",
        status === "empty" &&
          "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5",
        status === "past" &&
          "cursor-not-allowed border-transparent bg-muted/40 text-muted-foreground/50",
        status === "confirmed" &&
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        status === "pending" &&
          "border-amber-500/30 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:text-amber-400",
        status === "blocked" &&
          "border-transparent bg-neutral-800 text-neutral-100 hover:bg-neutral-700 dark:bg-neutral-900"
      )}
      style={
        status === "blocked"
          ? {
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 6px, transparent 6px, transparent 12px)",
            }
          : undefined
      }
    >
      {status === "empty" && formatCurrency(price)}
      {status === "past" && "—"}
      {status === "blocked" && <span className="line-clamp-1">Blocked</span>}
      {(status === "confirmed" || status === "pending") && (
        <span className="line-clamp-1 max-w-full">
          {primaryLabel ?? (status === "pending" ? "Pending" : "Booked")}
        </span>
      )}
    </button>
  );
}
