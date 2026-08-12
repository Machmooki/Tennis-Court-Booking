import { createClient } from "@/lib/supabase/server";
import { BookingDateNav } from "@/components/admin/bookings/booking-date-nav";
import { BookingsList } from "@/components/admin/bookings/bookings-list";
import { getDayRangeUTC, isValidIsoDate, todayIsoDate } from "@/lib/date";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date =
    dateParam && isValidIsoDate(dateParam) ? dateParam : todayIsoDate();
  const { startIso, endIso } = getDayRangeUTC(date);

  const supabase = await createClient();
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, start_time, end_time, status, total_price, court:courts(id, name), customer:customers(id, full_name, phone)"
    )
    .gte("start_time", startIso)
    .lt("start_time", endIso)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to load bookings: ${error.message}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Master view of all bookings for the selected day.
        </p>
      </div>

      <BookingDateNav date={date} />

      <BookingsList bookings={bookings ?? []} />
    </div>
  );
}
