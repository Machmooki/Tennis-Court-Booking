"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { BOOKING_TIMEZONE, todayIsoDate } from "@/lib/date";

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: BOOKING_TIMEZONE,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: BOOKING_TIMEZONE,
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: BOOKING_TIMEZONE,
});

function bookingDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000+07:00`);
}

export function HorizontalDateStrip({
  date,
  isPending,
  onDateSelect,
}: {
  date: string;
  isPending: boolean;
  onDateSelect: (date: string) => void;
}) {
  const selectedDateRef = useRef<HTMLButtonElement>(null);
  const dates = useMemo(() => {
    const [year, month] = date.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

    return Array.from(
      { length: daysInMonth },
      (_, index) => `${monthPrefix}-${String(index + 1).padStart(2, "0")}`
    ).filter((isoDate) => isoDate >= todayIsoDate());
  }, [date]);

  useEffect(() => {
    selectedDateRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [date]);

  return (
    <div
      className="flex snap-x gap-4 overflow-x-auto px-2 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Choose a booking date"
      aria-busy={isPending}
    >
      {dates.map((isoDate) => {
        const currentDate = bookingDate(isoDate);
        const isSelected = isoDate === date;

        return (
          <button
            key={isoDate}
            ref={isSelected ? selectedDateRef : undefined}
            type="button"
            aria-label={currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: BOOKING_TIMEZONE,
            })}
            aria-pressed={isSelected}
            onClick={() => onDateSelect(isoDate)}
            className={cn(
              "flex h-[90px] min-w-[70px] snap-center cursor-pointer flex-col items-center justify-center rounded-3xl border transition-all duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              isSelected
                ? "border-primary bg-primary/5 text-foreground shadow-sm"
                : "border-border bg-transparent text-foreground hover:border-primary/60 hover:bg-primary/5"
            )}
          >
            <span
              className={cn(
                "text-xs uppercase transition-all",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {dayFormatter.format(currentDate)}
            </span>
            <span className="text-2xl font-bold">
              {dateFormatter.format(currentDate)}
            </span>
            <span
              className={cn(
                "text-[10px] uppercase transition-all",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {monthFormatter.format(currentDate)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
