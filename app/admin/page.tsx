import { Suspense } from "react";
import { AnalyticsData } from "@/components/admin/analytics-data";
import { AnalyticsSkeleton } from "@/components/admin/analytics-skeleton";

// `AdminLayout` already redirects any signed-out or non-admin visitor before
// this page ever renders, so no separate auth check is needed here - this
// page has no blocking data fetches of its own, letting the header paint
// instantly while the analytics RPC streams in below.
export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Actual cash flow and activity for the current month, plus all-time
          membership growth.
        </p>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsData />
      </Suspense>
    </div>
  );
}
