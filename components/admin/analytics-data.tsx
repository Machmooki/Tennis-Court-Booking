import Link from "next/link";
import { CalendarCheck2, ChevronRight, Users2, Wallet } from "lucide-react";
import { AnalyticsChart } from "@/components/admin/analytics-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import type { AdminAnalytics } from "@/types/database";

const EMPTY_ANALYTICS: AdminAnalytics = {
  total_revenue: 0,
  total_bookings: 0,
  total_members: 0,
  bookings_by_court: [],
};

/**
 * The one slow piece of the admin dashboard (a jsonb-aggregating RPC) lives
 * here, rendered inside a `<Suspense>` boundary in `page.tsx` - the header
 * paints instantly on navigation while this streams in once it resolves.
 */
export async function AnalyticsData() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_analytics");

  if (error) {
    throw new Error(`Failed to load analytics: ${error.message}`);
  }

  const analytics = data ?? EMPTY_ANALYTICS;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Flow (This Month)
            </CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {formatCurrency(analytics.total_revenue)}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Completed Stripe/PromptPay payments
              </p>
              <Link
                href="/admin/transactions"
                className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
              >
                View details
                <ChevronRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bookings (This Month)
            </CardTitle>
            <CalendarCheck2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {analytics.total_bookings.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members (All-Time)
            </CardTitle>
            <Users2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {analytics.total_members.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registered accounts
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings by Court (This Month)</CardTitle>
          <CardDescription>
            Confirmed bookings and nominal booking value for each court.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsChart data={analytics.bookings_by_court} />
        </CardContent>
      </Card>
    </div>
  );
}
