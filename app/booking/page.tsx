import { createClient } from "@/lib/supabase/server";
import { isValidIsoDate, todayIsoDate } from "@/lib/date";
import { BookingDateNav } from "@/components/booking/date-nav";
import { SlotGrid } from "@/components/booking/slot-grid";
import { CheckoutBar } from "@/components/booking/checkout-bar";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date =
    dateParam && isValidIsoDate(dateParam) ? dateParam : todayIsoDate();

  const supabase = await createClient();
  const { data: courts, error } = await supabase
    .from("courts")
    .select("id, name, peak_price, off_peak_price, is_active, created_at, updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load courts: ${error.message}`);
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

        <SlotGrid date={date} courts={courts ?? []} />

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
