import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberNav } from "@/components/member/member-nav";
import { WalletSummaryCards } from "@/components/member/wallet-summary-cards";
import { BookingHistoryTable } from "@/components/member/booking-history-table";

export default async function MemberDashboardPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/member/login?redirect=/member/dashboard");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, full_name, wallet_hours_all_time, wallet_hours_off_peak")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (customerError) {
    throw new Error(`Failed to load your account: ${customerError.message}`);
  }

  // Should not happen after `handle_new_user_auto_link` (Phase 5.4.1)
  // provisions a customer row for every new member on signup - guard anyway
  // rather than crashing for accounts created before that migration.
  if (!customer) {
    return (
      <div className="min-h-screen bg-muted/30">
        <MemberNav email={userData.user.email ?? null} />
        <main className="mx-auto max-w-4xl p-4 sm:p-6">
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            We couldn&apos;t find your customer profile yet. Please contact
            the club to link your account.
          </div>
        </main>
      </div>
    );
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, status, court:courts(id, name)")
    .eq("customer_id", customer.id)
    .order("start_time", { ascending: false });

  if (bookingsError) {
    throw new Error(`Failed to load your bookings: ${bookingsError.message}`);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <MemberNav email={userData.user.email ?? null} />
      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {customer.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your hour credits and booking history.
          </p>
        </div>

        <WalletSummaryCards
          allTimeHours={customer.wallet_hours_all_time}
          offPeakHours={customer.wallet_hours_off_peak}
        />

        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Booking history
          </h2>
          <BookingHistoryTable bookings={bookings ?? []} />
        </div>
      </main>
    </div>
  );
}
