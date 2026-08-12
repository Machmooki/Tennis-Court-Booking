import { BOOKING_TIMEZONE, getDayRangeUTC } from "@/lib/date";

// Booking-grid time slots, evaluated in Bangkok wall-clock time (see
// `lib/date.ts`) since courts don't have a per-court timezone field yet and
// the business only operates in Thailand.
export const SLOT_START_HOUR = 6; // 6 AM Bangkok
export const SLOT_END_HOUR = 22; // 10 PM Bangkok (exclusive)
export const SLOT_DURATION_MINUTES = 60;

export interface TimeSlot {
  /** `${court-agnostic} start time`, ISO 8601, UTC instant. */
  startIso: string;
  endIso: string;
  /** Short label for the grid's time-axis, e.g. "6:00 AM". */
  label: string;
}

const timeLabelFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: BOOKING_TIMEZONE,
});

/** Generates the fixed list of bookable hourly slots for one ISO date. */
export function getDaySlots(isoDate: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  // `startIso` is the real UTC instant of Bangkok midnight for this date -
  // NOT midnight in its own UTC calendar day. Slot offsets below are added
  // as minutes-from-that-instant (never `setUTCHours`, which would silently
  // discard the correct date whenever Bangkok midnight falls on a different
  // UTC calendar day, e.g. every night).
  const { startIso } = getDayRangeUTC(isoDate);
  const dayStart = new Date(startIso);

  const slotCount =
    ((SLOT_END_HOUR - SLOT_START_HOUR) * 60) / SLOT_DURATION_MINUTES;

  for (let i = 0; i < slotCount; i++) {
    const start = new Date(dayStart);
    start.setUTCMinutes(
      start.getUTCMinutes() + SLOT_START_HOUR * 60 + i * SLOT_DURATION_MINUTES
    );

    const end = new Date(start);
    end.setUTCMinutes(end.getUTCMinutes() + SLOT_DURATION_MINUTES);

    slots.push({
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label: timeLabelFormatter.format(start),
    });
  }

  return slots;
}

export function isSlotInPast(startIso: string): boolean {
  return new Date(startIso).getTime() < Date.now();
}

/** Stable key for looking up a slot's availability regardless of source. */
export function slotKey(courtId: string, startIso: string): string {
  return `${courtId}|${new Date(startIso).toISOString()}`;
}
