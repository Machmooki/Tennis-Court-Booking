"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOKING_TIMEZONE, shiftIsoDate, todayIsoDate } from "@/lib/date";

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: BOOKING_TIMEZONE,
});

export function BookingDateNav({ date }: { date: string }) {
  const router = useRouter();
  const today = todayIsoDate();
  const isToday = date === today;
  const previousDate = shiftIsoDate(date, -1);

  function goToDate(nextDate: string) {
    router.push(`/booking?date=${nextDate}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        aria-label="Previous day"
        disabled={previousDate < today}
        onClick={() => goToDate(previousDate)}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div className="flex-1 text-center text-sm font-medium">
        {isToday
          ? "Today"
          : dateLabelFormatter.format(new Date(`${date}T00:00:00.000+07:00`))}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        aria-label="Next day"
        onClick={() => goToDate(shiftIsoDate(date, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
