// The business operates courts in a single timezone, so every "day"/"hour"
// boundary (today, slot generation, peak pricing) must be evaluated in
// Bangkok wall-clock time, not the server/browser's local time or naive UTC.
// Thailand has never observed DST, so a fixed +07:00 offset is always
// correct here - no IANA-aware date library is required.
export const BOOKING_TIMEZONE = "Asia/Bangkok";
const BANGKOK_OFFSET = "+07:00";
const BANGKOK_OFFSET_HOURS = 7;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

// `en-CA` is the one locale Intl guarantees formats as YYYY-MM-DD, which
// lets us read a UTC instant's *Bangkok* calendar date without manual
// offset math (important once we start crossing UTC day boundaries).
const bangkokIsoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOOKING_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Real UTC instant of Bangkok-local midnight for the given `isoDate`. */
function bangkokMidnightUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000${BANGKOK_OFFSET}`);
}

/** `isoDate` (YYYY-MM-DD) for `instant`, as seen on a Bangkok wall clock. */
function toBangkokIsoDate(instant: Date): string {
  return bangkokIsoDateFormatter.format(instant);
}

export function todayIsoDate(): string {
  return toBangkokIsoDate(new Date());
}

export function isValidIsoDate(value: string): boolean {
  return isoDatePattern.test(value) && !Number.isNaN(bangkokMidnightUtc(value).getTime());
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const date = bangkokMidnightUtc(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toBangkokIsoDate(date);
}

/**
 * Bangkok-calendar-day boundaries for `isoDate`, expressed as real UTC
 * instants - safe to compare directly against `timestamptz` columns.
 */
export function getDayRangeUTC(isoDate: string): {
  startIso: string;
  endIso: string;
} {
  const start = bangkokMidnightUtc(isoDate);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** The Bangkok wall-clock hour (0-23) that `iso` instant falls in. */
export function getBangkokHour(iso: string): number {
  return (new Date(iso).getUTCHours() + BANGKOK_OFFSET_HOURS) % 24;
}
