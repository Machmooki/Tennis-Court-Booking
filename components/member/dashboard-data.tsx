import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { WalletSummaryCards } from "@/components/member/wallet-summary-cards";
import { BookingHistoryTable } from "@/components/member/booking-history-table";
import { WalletHistoryTable } from "@/components/member/wallet-history-table";
import { DashboardTabs } from "@/components/member/dashboard-tabs";

/**
 * Everything on the member dashboard that actually needs a database round
 * trip lives here, rendered inside a `<Suspense>` boundary in `page.tsx` -
 * the nav/header shell paints instantly on navigation (great on Vercel
 * cold starts) while this streams in once the queries resolve.
 */
export async function DashboardData({ authUserId }: { authUserId: string }) {
  const supabase = await createClient();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select(
      "id, full_name, phone, wallet_hours_all_time, wallet_hours_off_peak"
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (customerError) {
    throw new Error(`Failed to load your account: ${customerError.message}`);
  }

  // Should not happen after `handle_new_user_auto_link` (Phase 5.4.1)
  // provisions a customer row for every new member on signup - guard anyway
  // rather than crashing for accounts created before that migration.
  if (!customer) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        We couldn&apos;t find your customer profile yet. Please contact the
        club to link your account.
      </div>
    );
  }

  // Fetched in parallel since neither query depends on the other.
  const [bookingsResult, walletTransactionsResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, start_time, end_time, created_at, total_price, status, court:courts(id, name)"
      )
      .eq("customer_id", customer.id)
      .order("start_time", { ascending: false }),
    supabase
      .from("wallet_transactions")
      .select("id, type, hours_amount, note, created_at, package:packages(name)")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
  ]);

  if (bookingsResult.error) {
    throw new Error(
      `Failed to load your bookings: ${bookingsResult.error.message}`
    );
  }
  if (walletTransactionsResult.error) {
    throw new Error(
      `Failed to load your wallet history: ${walletTransactionsResult.error.message}`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {customer.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your hour credits and booking history.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/booking" />}
          className="h-11 shrink-0 rounded-full"
        >
          Book a Court 🎾
        </Button>
      </div>

      <WalletSummaryCards
        allTimeHours={customer.wallet_hours_all_time}
        offPeakHours={customer.wallet_hours_off_peak}
      />

      <DashboardTabs
        bookingHistory={
          <BookingHistoryTable
            bookings={bookingsResult.data ?? []}
            customerName={customer.full_name}
            customerPhone={customer.phone}
          />
        }
        walletHistory={
          <WalletHistoryTable
            transactions={walletTransactionsResult.data ?? []}
          />
        }
      />
    </div>
  );
}
