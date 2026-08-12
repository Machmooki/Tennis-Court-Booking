"use client";

import { Fragment, useMemo } from "react";
import { SlotCell, type SlotStatus } from "@/components/booking/slot-cell";
import { useAvailability } from "@/lib/booking/use-availability";
import { useBookingStore } from "@/lib/booking/store";
import { getDaySlots, isSlotInPast, slotKey } from "@/lib/booking/slots";
import { getSlotPrice } from "@/lib/booking/pricing";
import type { CourtRow } from "@/types/database";

export function SlotGrid({
  date,
  courts,
}: {
  date: string;
  courts: CourtRow[];
}) {
  const { availability, isLoading, isRealtimeConnected } =
    useAvailability(date);
  const selectedSlots = useBookingStore((s) => s.selectedSlots);
  const toggleSlot = useBookingStore((s) => s.toggleSlot);

  const slots = useMemo(() => getDaySlots(date), [date]);
  const selectedKeys = useMemo(
    () => new Set(selectedSlots.map((s) => slotKey(s.courtId, s.startIso))),
    [selectedSlots]
  );

  if (courts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No courts are available for booking right now.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={`size-2 rounded-full ${
            isRealtimeConnected ? "bg-emerald-500" : "bg-muted-foreground/40"
          }`}
        />
        {isRealtimeConnected ? "Live availability" : "Connecting…"}
        {isLoading && " · Loading…"}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `72px repeat(${courts.length}, minmax(84px, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-10 border-b bg-card" />
          {courts.map((court) => (
            <div
              key={court.id}
              className="border-b border-l bg-card p-2 text-center text-xs font-semibold"
            >
              {court.name}
            </div>
          ))}

          {slots.map((slot) => (
            <Fragment key={slot.startIso}>
              <div className="sticky left-0 z-10 flex items-center justify-end border-b bg-card px-2 text-[11px] text-muted-foreground">
                {slot.label}
              </div>
              {courts.map((court) => {
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
                  <div key={court.id} className="border-b border-l p-1">
                    <SlotCell
                      status={status}
                      price={price}
                      ariaLabel={`${court.name}, ${slot.label}, ${status}, ${price}`}
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
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
