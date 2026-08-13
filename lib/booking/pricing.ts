import { getBangkokHour } from "@/lib/date";
import type { CourtRow } from "@/types/database";

// Peak hours are not yet configurable per-court in the schema, so this is a
// simple, documented placeholder business rule: evenings are "peak" every
// day of the week. Revisit if admins need per-court/day schedules later.
export const PEAK_HOUR_START = 17; // 17:00 Bangkok
export const PEAK_HOUR_END = 21; // 21:00 Bangkok (exclusive)

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

export interface WalletHoursBreakdown {
  peakHours: number;
  offPeakHours: number;
}

/**
 * Splits a set of booking slots into peak vs off-peak hours, mirroring the
 * two-bucket wallet rule enforced server-side by the `pay_with_wallet` RPC
 * (supabase/migrations/20260813060000_pay_with_wallet_rpc.sql). Used purely
 * for client-side display (e.g. "this will deduct 2 peak hours") - the RPC
 * re-derives and re-validates this itself, never trusting the client.
 */
export function getWalletHoursBreakdown(
  slots: { startIso: string; endIso: string }[]
): WalletHoursBreakdown {
  return slots.reduce<WalletHoursBreakdown>(
    (acc, slot) => {
      const hours =
        (new Date(slot.endIso).getTime() - new Date(slot.startIso).getTime()) /
        (1000 * 60 * 60);
      if (isPeakHour(slot.startIso)) {
        acc.peakHours += hours;
      } else {
        acc.offPeakHours += hours;
      }
      return acc;
    },
    { peakHours: 0, offPeakHours: 0 }
  );
}

export interface WalletBalance {
  allTimeHours: number;
  offPeakHours: number;
}

/**
 * Whether `balance` covers `breakdown`: peak hours must come entirely from
 * the flexible all-time bucket; off-peak hours draw from the off-peak
 * bucket first, then spill into whatever all-time balance is left over.
 */
export function canPayWithWallet(
  breakdown: WalletHoursBreakdown,
  balance: WalletBalance
): boolean {
  const remainingAllTime = balance.allTimeHours - breakdown.peakHours;
  if (remainingAllTime < 0) return false;
  return balance.offPeakHours + remainingAllTime >= breakdown.offPeakHours;
}

export interface WalletDebitPreview {
  allTimeDebit: number;
  offPeakDebit: number;
}

/**
 * Previews exactly which bucket(s) `pay_with_wallet` will deduct from, for
 * display only (e.g. "this will deduct 2 All-Time hours"). Must mirror that
 * RPC's allocation order: off-peak hours draw from the off-peak bucket
 * first, then spill into all-time; peak hours always come from all-time.
 */
export function getWalletDebitPreview(
  breakdown: WalletHoursBreakdown,
  balance: WalletBalance
): WalletDebitPreview {
  const fromOffPeakBucket = Math.min(balance.offPeakHours, breakdown.offPeakHours);
  const fromAllTimeForOffPeak = breakdown.offPeakHours - fromOffPeakBucket;
  return {
    allTimeDebit: breakdown.peakHours + fromAllTimeForOffPeak,
    offPeakDebit: fromOffPeakBucket,
  };
}
