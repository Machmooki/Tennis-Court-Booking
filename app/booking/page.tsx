import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDayRangeUTC, isValidIsoDate, todayIsoDate } from "@/lib/date";
import { BookingDateNav } from "@/components/booking/date-nav";
import { BookingAuthHeader } from "@/components/booking/booking-auth-header";
import { SlotGrid } from "@/components/booking/slot-grid";
import { CheckoutBar } from "@/components/booking/checkout-bar";
import { Skeleton } from "@/components/ui/skeleton";
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
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur supports-backdrop-filter:bg-card/60">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link
            href="/"
            aria-label="Back to home"
            className="inline-flex min-h-11 items-center text-sm font-semibold tracking-tight transition-opacity hover:opacity-70 focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Tennis Court Booking
          </Link>
          <Suspense
            fallback={<Skeleton className="h-9 w-24 rounded-full bg-muted/70" />}
          >
            <BookingAuthHeader />
          </Suspense>
        </div>
      </header>

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
