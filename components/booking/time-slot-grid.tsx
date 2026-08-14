"use client";

import { useMemo } from "react";
import { SlotCell, type SlotStatus } from "@/components/booking/slot-cell";
import type { AvailabilityMap } from "@/lib/booking/use-court-slots";
import { useBookingStore } from "@/lib/booking/store";
import { getDaySlots, isSlotInPast, slotKey } from "@/lib/booking/slots";
import { getSlotPrice } from "@/lib/booking/pricing";
import type { CourtRow } from "@/types/database";

export function TimeSlotGrid({
  date,
  court,
  availability,
}: {
  date: string;
  court: CourtRow;
  availability: AvailabilityMap;
}) {
  const selectedSlots = useBookingStore((state) => state.selectedSlots);
  const toggleSlot = useBookingStore((state) => state.toggleSlot);
  const slots = useMemo(() => getDaySlots(date), [date]);
  const selectedKeys = useMemo(
    () =>
      new Set(
        selectedSlots.map((slot) => slotKey(slot.courtId, slot.startIso))
      ),
    [selectedSlots]
  );

  return (
    <div
      className="grid grid-cols-2 gap-3 min-[380px]:grid-cols-3 sm:grid-cols-4"
      aria-label={`${court.name} available times`}
    >
      {slots.map((slot) => {
        const key = slotKey(court.id, slot.startIso);
        const isBooked = availability.has(key);
        const isPast = isSlotInPast(slot.startIso);
        const isSelected = selectedKeys.has(key);
        const price = getSlotPrice(court, slot.startIso);
        const status: SlotStatus = isSelected
          ? "selected"
          : isBooked
            ? "booked"
            : isPast
              ? "past"
              : "available";

        return (
          <SlotCell
            key={slot.startIso}
            status={status}
            label={slot.label}
            ariaLabel={`${court.name}, ${slot.label}, ${status}`}
            onSelect={() =>
              toggleSlot({
                courtId: court.id,
                courtName: court.name,
                startIso: slot.startIso,
                endIso: slot.endIso,
                price,
              })
            }
          />
        );
      })}
    </div>
  );
}
