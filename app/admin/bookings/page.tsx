import { createClient } from "@/lib/supabase/server";
import { AdminBookingsInteractive } from "@/components/admin/bookings/admin-bookings-interactive";
import { getDayRangeUTC, todayIsoDate } from "@/lib/date";

export default async function AdminBookingsPage() {
  const date = todayIsoDate();
  const { startIso, endIso } = getDayRangeUTC(date);

  const supabase = await createClient();

  const [{ data: courts, error: courtsError }, { data: bookings, error: bookingsError }] =
    await Promise.all([
      supabase
        .from("courts")
        .select("id, name, peak_price, off_peak_price")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("bookings")
        .select(
          "id, court_id, start_time, end_time, created_at, status, total_price, note, customer:customers(id, full_name, phone)"
        )
        .neq("status", "cancelled")
        .gte("start_time", startIso)
        .lt("start_time", endIso)
        .order("start_time", { ascending: true }),
    ]);

  if (courtsError) {
    throw new Error(`Failed to load courts: ${courtsError.message}`);
  }
  if (bookingsError) {
    throw new Error(`Failed to load bookings: ${bookingsError.message}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Interactive master grid for the selected day. Click an empty slot to
          book or block it, or click an existing slot to manage it.
        </p>
      </div>

      <AdminBookingsInteractive
        initialDate={date}
        courts={courts ?? []}
        initialBookings={bookings ?? []}
      />
    </div>
  );
}
