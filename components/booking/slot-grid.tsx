"use client";

import { useState } from "react";
import { CourtSelector } from "@/components/booking/court-selector";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";
import { useAvailability } from "@/lib/booking/use-availability";
import type { BookingStatus, CourtRow } from "@/types/database";

export function SlotGrid({
  date,
  courts,
  initialAvailability,
}: {
  date: string;
  courts: CourtRow[];
  initialAvailability?: Record<string, BookingStatus>;
}) {
  const [selectedCourtId, setSelectedCourtId] = useState(courts[0]?.id ?? "");
  const selectedCourt =
    courts.find((court) => court.id === selectedCourtId) ?? courts[0];

  if (!selectedCourt) {
    return (
      <section>
        <h2 className="mt-8 mb-4 text-2xl font-semibold">Available Times</h2>
        <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No courts are available for booking right now.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mt-8 mb-4 text-2xl font-semibold">Choose a Court</h2>
      <CourtSelector
        courts={courts}
        selectedCourtId={selectedCourt.id}
        onCourtChange={setSelectedCourtId}
      />

      <AvailabilityTimeSlots
        key={date}
        date={date}
        court={selectedCourt}
        initialAvailability={initialAvailability}
      />
    </section>
  );
}

function AvailabilityTimeSlots({
  date,
  court,
  initialAvailability,
}: {
  date: string;
  court: CourtRow;
  initialAvailability?: Record<string, BookingStatus>;
}) {
  const { availability, isLoading, isRealtimeConnected } = useAvailability(
    date,
    initialAvailability
  );

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Available Times</h2>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`size-2 rounded-full transition-all ${
              isRealtimeConnected ? "bg-emerald-500" : "bg-muted-foreground/40"
            }`}
          />
          {isLoading
            ? "Loading…"
            : isRealtimeConnected
              ? "Live"
              : "Connecting…"}
        </div>
      </div>

      <TimeSlotGrid date={date} court={court} availability={availability} />
    </div>
  );
}
