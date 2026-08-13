import { createClient } from "@/lib/supabase/client";
import { getDayRangeUTC, todayIsoDate } from "@/lib/date";
import { getDaySlots, isSlotInPast, slotKey } from "@/lib/booking/slots";

const MONTH_SEARCH_LIMIT = 120;
const QUERY_PAGE_SIZE = 1000;

interface OccupiedSlotRow {
  court_id: string;
  start_time: string;
}

function monthStart(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

function shiftIsoMonth(isoDate: string, months: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));

  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function datesInMonth(isoMonthStart: string): string[] {
  const [year, month] = isoMonthStart.split("-").map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = isoMonthStart.slice(0, 7);

  return Array.from(
    { length: days },
    (_, index) => `${prefix}-${String(index + 1).padStart(2, "0")}`
  );
}

async function getOccupiedSlotsForMonth(
  isoMonthStart: string
): Promise<Set<string>> {
  const supabase = createClient();
  const nextMonthStart = shiftIsoMonth(isoMonthStart, 1);
  const rangeStart = getDayRangeUTC(isoMonthStart).startIso;
  const rangeEnd = getDayRangeUTC(nextMonthStart).startIso;
  const occupied = new Set<string>();

  for (let from = 0; ; from += QUERY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("court_availability")
      .select("court_id, start_time")
      .gte("start_time", rangeStart)
      .lt("start_time", rangeEnd)
      .order("start_time", { ascending: true })
      .order("court_id", { ascending: true })
      .range(from, from + QUERY_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to check monthly availability: ${error.message}`);
    }

    const rows = (data ?? []) as OccupiedSlotRow[];
    for (const row of rows) {
      occupied.add(slotKey(row.court_id, row.start_time));
    }

    if (rows.length < QUERY_PAGE_SIZE) break;
  }

  return occupied;
}

function firstBookableDate(
  isoMonthStart: string,
  courtIds: string[],
  occupied: Set<string>
): string | null {
  const today = todayIsoDate();

  for (const isoDate of datesInMonth(isoMonthStart)) {
    if (isoDate < today) continue;

    const hasAvailableSlot = getDaySlots(isoDate).some(
      (slot) =>
        !isSlotInPast(slot.startIso) &&
        courtIds.some(
          (courtId) => !occupied.has(slotKey(courtId, slot.startIso))
        )
    );

    if (hasAvailableSlot) return isoDate;
  }

  return null;
}

export async function findBookableDateByMonth({
  date,
  direction,
  courtIds,
}: {
  date: string;
  direction: -1 | 1;
  courtIds: string[];
}): Promise<string | null> {
  if (courtIds.length === 0) return null;

  const currentMonth = monthStart(todayIsoDate());
  let candidateMonth = shiftIsoMonth(monthStart(date), direction);

  for (let attempt = 0; attempt < MONTH_SEARCH_LIMIT; attempt++) {
    if (direction === -1 && candidateMonth < currentMonth) return null;

    const occupied = await getOccupiedSlotsForMonth(candidateMonth);
    const bookableDate = firstBookableDate(
      candidateMonth,
      courtIds,
      occupied
    );

    if (bookableDate) return bookableDate;
    candidateMonth = shiftIsoMonth(candidateMonth, direction);
  }

  return null;
}
