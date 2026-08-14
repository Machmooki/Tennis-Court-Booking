"use client";

import { useState } from "react";
import { BookingDateControls } from "@/components/booking/booking-date-controls";
import { CheckoutBar } from "@/components/booking/checkout-bar";
import { SlotGrid } from "@/components/booking/slot-grid";
import { todayIsoDate } from "@/lib/date";
import type { CourtRow } from "@/types/database";

export function BookingInteractive({ courts }: { courts: CourtRow[] }) {
  const [selectedDate, setSelectedDate] = useState(todayIsoDate);
  const [selectedCourtId, setSelectedCourtId] = useState(courts[0]?.id ?? "");

  return (
    <>
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Book a court
          </h1>
          <p className="text-sm text-muted-foreground">
            Tap a time slot to select it, then check out with just your name
            and phone.
          </p>
        </div>

        <BookingDateControls
          date={selectedDate}
          courtIds={courts.map((court) => court.id)}
          onDateSelect={setSelectedDate}
        />

        <SlotGrid
          date={selectedDate}
          courts={courts}
          selectedCourtId={selectedCourtId}
          onCourtChange={setSelectedCourtId}
        />

        <Legend />
      </div>

      <CheckoutBar />
    </>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <LegendItem swatchClassName="border bg-card" label="Available" />
      <LegendItem swatchClassName="bg-primary" label="Selected" />
      <LegendItem swatchClassName="bg-muted" label="Booked" />
    </div>
  );
}

function LegendItem({
  swatchClassName,
  label,
}: {
  swatchClassName: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-3 rounded-sm ${swatchClassName}`} />
      {label}
    </span>
  );
}
