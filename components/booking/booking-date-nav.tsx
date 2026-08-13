"use client";

import { useState } from "react";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BOOKING_TIMEZONE, shiftIsoDate, todayIsoDate } from "@/lib/date";

const dateLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: BOOKING_TIMEZONE,
});

function calendarDateFromIso(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isoDateFromCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function BookingDateNav({
  date,
  isPending,
  onDateSelect,
  onMonthSelect,
}: {
  date: string;
  isPending: boolean;
  onDateSelect: (date: string) => void;
  onMonthSelect: (direction: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = todayIsoDate();
  const selectedDate = calendarDateFromIso(date);
  const todayDate = calendarDateFromIso(today);
  const dateLabel = dateLabelFormatter.format(
    new Date(`${date}T00:00:00.000+07:00`)
  );
  const currentMonth = today.slice(0, 7);
  const selectedMonth = date.slice(0, 7);

  function selectDate(nextDate: Date | undefined) {
    if (!nextDate) return;

    const nextIsoDate = isoDateFromCalendarDate(nextDate);
    setOpen(false);
    onDateSelect(nextIsoDate);
  }

  return (
    <div className="flex items-center justify-center gap-4 pt-2 sm:gap-4">
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Previous available month"
        disabled={selectedMonth <= currentMonth || isPending}
        onClick={() => onMonthSelect(-1)}
        className="size-9 shrink-0 rounded-full border-input bg-background shadow-sm transition-all hover:border-primary hover:bg-background hover:shadow-md sm:size-9"
      >
        <ChevronLeftIcon className="size-5" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              aria-busy={isPending}
              className="flex h-auto min-w-0 items-center gap-3 rounded-full border border-input bg-background px-5 py-2 text-sm font-medium shadow-sm transition-all hover:border-primary hover:bg-background hover:shadow-md sm:px-8 sm:text-base"
            />
          }
        >
          <CalendarIcon className="size-5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {date === today ? `Today, ${dateLabel}` : dateLabel}
          </span>
          <ChevronDownIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </PopoverTrigger>

        <PopoverContent className="w-auto rounded-2xl p-0" align="center">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selectedDate}
            defaultMonth={selectedDate}
            endMonth={calendarDateFromIso(shiftIsoDate(today, 3650))}
            disabled={{ before: todayDate }}
            onSelect={selectDate}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Next available month"
        disabled={isPending}
        onClick={() => onMonthSelect(1)}
        className="size-9 shrink-0 rounded-full border-input bg-background shadow-sm transition-all hover:border-primary hover:bg-background hover:shadow-md sm:size-9"
      >
        <ChevronRightIcon className="size-5" />
      </Button>
    </div>
  );
}
