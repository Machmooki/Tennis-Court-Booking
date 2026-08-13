"use client";

import { cn } from "@/lib/utils";
import type { CourtRow } from "@/types/database";

export function CourtSelector({
  courts,
  selectedCourtId,
  onCourtChange,
}: {
  courts: CourtRow[];
  selectedCourtId: string;
  onCourtChange: (courtId: string) => void;
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Choose a court"
    >
      {courts.map((court) => {
        const isSelected = court.id === selectedCourtId;

        return (
          <button
            key={court.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onCourtChange(court.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition-all duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-foreground hover:border-primary hover:shadow-sm"
            )}
          >
            {court.name}
          </button>
        );
      })}
    </div>
  );
}
