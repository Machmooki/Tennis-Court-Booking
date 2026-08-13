import { createClient } from "@/lib/supabase/server";
import { getDayRangeUTC, isValidIsoDate, todayIsoDate } from "@/lib/date";
import { BookingDateNav } from "@/components/booking/date-nav";
import { SlotGrid } from "@/components/booking/slot-grid";
import { CheckoutBar } from "@/components/booking/checkout-bar";
import { slotKey } from "@/lib/booking/slots";
import type { BookingStatus } from "@/types/database";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date =
    dateParam && isValidIsoDate(dateParam) ? dateParam : todayIsoDate();

  const supabase = await createClient();
  const range = getDayRangeUTC(date);

  // Parallel fetch: courts + occupancy for the selected day so the grid is
  // painted on first paint instead of waiting for a client-side waterfall.
  const [courtsResult, availabilityResult] = await Promise.all([
    supabase
      .from("courts")
      .select(
        "id, name, peak_price, off_peak_price, is_active, created_at, updated_at"
      )
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("court_availability")
      .select("court_id, start_time, status")
      .gte("start_time", range.startIso)
      .lt("start_time", range.endIso),
  ]);

  if (courtsResult.error) {
    throw new Error(`Failed to load courts: ${courtsResult.error.message}`);
  }

  // Plain object (not Map) so it can cross the RSC → client boundary.
  const initialAvailability: Record<string, BookingStatus> = {};
  if (availabilityResult.error) {
    console.error(
      "[booking] failed to prefetch availability:",
      availabilityResult.error.message
    );
  } else {
    for (const row of availabilityResult.data ?? []) {
      initialAvailability[slotKey(row.court_id, row.start_time)] =
        row.status as BookingStatus;
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Book a court
          </h1>
          <p className="text-sm text-muted-foreground">
            Tap a time slot to select it, then check out with just your name
            and phone.
          </p>
        </div>

        <BookingDateNav date={date} />

        <SlotGrid
          date={date}
          courts={courtsResult.data ?? []}
          initialAvailability={initialAvailability}
        />

        <Legend />
      </div>

      <CheckoutBar />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <LegendItem swatchClassName="border bg-card" label="Available" />
      <LegendItem swatchClassName="bg-primary" label="Selected" />
      <LegendItem swatchClassName="bg-muted" label="Booked" />
    </div>
  );
}

function LegendItem({
  swatchClassName,
  label,
}: {
  swatchClassName: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-3 rounded-sm ${swatchClassName}`} />
      {label}
    </span>
  );
}
