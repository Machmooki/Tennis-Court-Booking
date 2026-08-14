"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shiftIsoDate, todayIsoDate } from "@/lib/date";

export function BookingDateNav({
  date,
  onDateSelect,
}: {
  date: string;
  onDateSelect: (date: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        aria-label="Previous day"
        onClick={() => onDateSelect(shiftIsoDate(date, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Input
        type="date"
        value={date}
        onChange={(event) => {
          if (event.target.value) onDateSelect(event.target.value);
        }}
        className="h-11 w-auto"
        aria-label="Selected date"
      />

      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        aria-label="Next day"
        onClick={() => onDateSelect(shiftIsoDate(date, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>

      <Button
        variant="ghost"
        className="h-11"
        onClick={() => onDateSelect(todayIsoDate())}
      >
        Today
      </Button>
    </div>
  );
}
