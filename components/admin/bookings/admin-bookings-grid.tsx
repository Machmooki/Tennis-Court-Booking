"use client";

import { Fragment, useMemo, useState } from "react";
import {
  AdminSlotCell,
  type AdminSlotStatus,
} from "@/components/admin/bookings/admin-slot-cell";
import {
  CreateSlotDialog,
  type CreateSlotTarget,
} from "@/components/admin/bookings/create-slot-dialog";
import {
  SlotDetailsDialog,
  type SlotDetailsTarget,
} from "@/components/admin/bookings/slot-details-dialog";
import { getDaySlots, isSlotInPast, slotKey } from "@/lib/booking/slots";
import { getSlotPrice } from "@/lib/booking/pricing";
import type { BookingStatus } from "@/types/database";

export interface AdminGridCourt {
  id: string;
  name: string;
  peak_price: number;
  off_peak_price: number;
}

export interface AdminGridBooking {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
  status: BookingStatus;
  total_price: number;
  note: string | null;
  customer: { id: string; full_name: string; phone: string } | null;
}

const LEGEND: { label: string; swatchClassName: string }[] = [
  { label: "Empty", swatchClassName: "border border-border bg-card" },
  { label: "Confirmed", swatchClassName: "bg-primary" },
  { label: "Pending", swatchClassName: "bg-amber-500/70" },
  { label: "Blocked", swatchClassName: "bg-neutral-800" },
];

export function AdminBookingsGrid({
  date,
  courts,
  bookings,
  onBookingsChanged,
}: {
  date: string;
  courts: AdminGridCourt[];
  bookings: AdminGridBooking[];
  onBookingsChanged: () => void;
}) {
  const slots = useMemo(() => getDaySlots(date), [date]);

  const bookingMap = useMemo(() => {
    const map = new Map<string, AdminGridBooking>();
    for (const booking of bookings) {
      map.set(slotKey(booking.court_id, booking.start_time), booking);
    }
    return map;
  }, [bookings]);

  const [createTarget, setCreateTarget] = useState<CreateSlotTarget | null>(
    null
  );
  const [detailsTarget, setDetailsTarget] =
    useState<SlotDetailsTarget | null>(null);

  if (courts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No active courts. Activate a court to start building the grid.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span
                className={`size-2.5 rounded-sm ${item.swatchClassName}`}
              />
              {item.label}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <div
            className="grid min-w-max"
            style={{
              gridTemplateColumns: `76px repeat(${courts.length}, minmax(112px, 1fr))`,
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
                  const booking = bookingMap.get(key);
                  const isPast = isSlotInPast(slot.startIso);
                  const price = getSlotPrice(court, slot.startIso);

                  let status: AdminSlotStatus;
                  if (!booking) {
                    status = isPast ? "past" : "empty";
                  } else if (booking.status === "blocked") {
                    status = "blocked";
                  } else if (booking.status === "pending") {
                    status = "pending";
                  } else {
                    status = "confirmed";
                  }

                  const primaryLabel =
                    booking?.status === "blocked"
                      ? "Blocked"
                      : (booking?.customer?.full_name ?? null);

                  return (
                    <div key={court.id} className="border-b border-l p-1">
                      <AdminSlotCell
                        status={status}
                        price={price}
                        primaryLabel={primaryLabel}
                        ariaLabel={`${court.name}, ${slot.label}, ${status}`}
                        onClick={() => {
                          if (!booking) {
                            if (isPast) return;
                            setCreateTarget({
                              courtId: court.id,
                              courtName: court.name,
                              startIso: slot.startIso,
                              endIso: slot.endIso,
                              timeLabel: slot.label,
                              defaultPrice: price,
                            });
                            return;
                          }

                          setDetailsTarget({
                            bookingId: booking.id,
                            courtName: court.name,
                            timeLabel: slot.label,
                            startIso: booking.start_time,
                            endIso: booking.end_time,
                            createdAtIso: booking.created_at,
                            status: booking.status,
                            totalPrice: booking.total_price,
                            note: booking.note,
                            customerName: booking.customer?.full_name ?? null,
                            customerPhone: booking.customer?.phone ?? null,
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <CreateSlotDialog
        target={createTarget}
        onOpenChange={(open) => {
          if (!open) setCreateTarget(null);
        }}
        onSuccess={() => {
          setCreateTarget(null);
          onBookingsChanged();
        }}
      />

      <SlotDetailsDialog
        target={detailsTarget}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null);
        }}
        onSuccess={() => {
          setDetailsTarget(null);
          onBookingsChanged();
        }}
      />
    </>
  );
}
