"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  AdminBookingsGrid,
  type AdminGridBooking,
  type AdminGridCourt,
} from "@/components/admin/bookings/admin-bookings-grid";
import { BookingDateNav } from "@/components/admin/bookings/booking-date-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { getDayRangeUTC } from "@/lib/date";

const GRID_ROWS = 18;

async function fetchAdminBookings(date: string): Promise<AdminGridBooking[]> {
  const supabase = createClient();
  const { startIso, endIso } = getDayRangeUTC(date);
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, court_id, start_time, end_time, created_at, status, total_price, note, customer:customers(id, full_name, phone)"
    )
    .neq("status", "cancelled")
    .gte("start_time", startIso)
    .lt("start_time", endIso)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to load bookings: ${error.message}`);
  }

  return (data ?? []) as AdminGridBooking[];
}

export function AdminBookingsInteractive({
  initialDate,
  courts,
  initialBookings,
}: {
  initialDate: string;
  courts: AdminGridCourt[];
  initialBookings: AdminGridBooking[];
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `admin-bookings:${selectedDate}`,
    () => fetchAdminBookings(selectedDate),
    {
      fallbackData:
        selectedDate === initialDate ? initialBookings : undefined,
      keepPreviousData: false,
      revalidateOnMount: selectedDate === initialDate ? false : undefined,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
  const showSkeleton = isLoading || isValidating;

  return (
    <>
      <BookingDateNav date={selectedDate} onDateSelect={setSelectedDate} />

      {showSkeleton ? (
        <AdminGridSkeleton courts={courts} />
      ) : error ? (
        <div
          className="rounded-lg border border-dashed p-10 text-center text-sm text-destructive"
          role="alert"
        >
          We couldn&apos;t load bookings for this date. Please try again.
        </div>
      ) : (
        <AdminBookingsGrid
          key={selectedDate}
          date={selectedDate}
          courts={courts}
          bookings={data ?? []}
          onBookingsChanged={() => {
            void mutate();
          }}
        />
      )}
    </>
  );
}

function AdminGridSkeleton({ courts }: { courts: AdminGridCourt[] }) {
  if (courts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No active courts. Activate a court to start building the grid.
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label="Loading bookings" aria-busy="true">
      <div className="flex flex-wrap items-center gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-16" />
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `76px repeat(${courts.length}, minmax(112px, 1fr))`,
          }}
        >
          <div className="border-b bg-card" />
          {courts.map((court) => (
            <div
              key={court.id}
              className="border-b border-l bg-card p-2 text-center text-xs font-semibold"
            >
              {court.name}
            </div>
          ))}

          {Array.from({ length: GRID_ROWS }).map((_, rowIndex) => (
            <div key={rowIndex} className="contents">
              <div className="flex items-center justify-end border-b bg-card px-2">
                <Skeleton className="h-3 w-9" />
              </div>
              {courts.map((court) => (
                <div key={court.id} className="border-b border-l p-1">
                  <Skeleton className="h-11 w-full rounded-md" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
