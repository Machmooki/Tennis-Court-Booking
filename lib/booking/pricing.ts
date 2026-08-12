import { getBangkokHour } from "@/lib/date";
import type { CourtRow } from "@/types/database";

// Peak hours are not yet configurable per-court in the schema, so this is a
// simple, documented placeholder business rule: evenings are "peak" every
// day of the week. Revisit if admins need per-court/day schedules later.
export const PEAK_HOUR_START = 17; // 5 PM Bangkok
export const PEAK_HOUR_END = 21; // 9 PM Bangkok (exclusive)

/**
 * Whether a slot starting at `startIso` falls in a peak-pricing window.
 * Evaluated in Bangkok wall-clock time (see `lib/date.ts`) - a raw
 * `getUTCHours()` would be wrong here since a slot's UTC calendar day/hour
 * doesn't line up with its Bangkok one.
 */
export function isPeakHour(startIso: string): boolean {
  const hour = getBangkokHour(startIso);
  return hour >= PEAK_HOUR_START && hour < PEAK_HOUR_END;
}

export function getSlotPrice(
  court: Pick<CourtRow, "peak_price" | "off_peak_price">,
  startIso: string
): number {
  return isPeakHour(startIso) ? court.peak_price : court.off_peak_price;
}
