import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookingAuthHeader } from "@/components/booking/booking-auth-header";
import { BookingInteractive } from "@/components/booking/booking-interactive";
import { Skeleton } from "@/components/ui/skeleton";

export default async function BookingPage() {
  const supabase = await createClient();
  const courtsResult = await supabase
    .from("courts")
    .select(
      "id, name, peak_price, off_peak_price, is_active, created_at, updated_at"
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (courtsResult.error) {
    throw new Error(`Failed to load courts: ${courtsResult.error.message}`);
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

      <BookingInteractive courts={courtsResult.data ?? []} />
    </div>
  );
}
