import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsSkeleton } from "@/components/admin/analytics-skeleton";

// Route-level fallback while the page component itself is still being
// resolved (e.g. a cold Vercel lambda) - `AdminDashboardPage`'s own inline
// <Suspense fallback={<AnalyticsSkeleton />}> takes over after that, so the
// two skeletons intentionally share the same cards+chart markup.
export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-lg bg-muted/70" />
        <Skeleton className="h-4 w-96 max-w-full rounded-full bg-muted/60" />
      </div>

      <AnalyticsSkeleton />
    </div>
  );
}
