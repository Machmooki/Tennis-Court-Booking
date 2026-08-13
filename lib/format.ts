import { BOOKING_TIMEZONE } from "@/lib/date";

// THB is conventionally shown without decimal places (no satang in everyday
// display), and `minimumFractionDigits: 0` keeps whole-baht prices from
// rendering as "500.00" everywhere in the UI.
const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: BOOKING_TIMEZONE,
});

// Strict 24-hour clock (00–23), zero-padded, no AM/PM. `hourCycle: "h23"`
// beats `hour12: false` alone - some engines still emit 12-hour forms for
// certain locales without an explicit cycle. Always Asia/Bangkok.
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: BOOKING_TIMEZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: BOOKING_TIMEZONE,
});

/** Formats a THB amount. Never hardcode "฿" or "THB" directly - use this. */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** Bangkok wall-clock time as `HH:mm` (24-hour), e.g. `"06:00"`, `"14:30"`. */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** Bangkok date + 24-hour time, e.g. `"13 Aug 2026, 06:00"`. */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** Formats a duration as `m:ss`, e.g. `900` seconds -> `"15:00"`. */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
