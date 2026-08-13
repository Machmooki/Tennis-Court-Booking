import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSkeleton } from "@/components/member/dashboard-skeleton";

// Route-level fallback shown while Next.js is still resolving the page
// component itself (e.g. straight from a cold Vercel lambda) - once the page
// is rendering, its own inline <Suspense fallback={<DashboardSkeleton />}>
// takes over for just the data-dependent section below the nav.
export default function MemberDashboardLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="flex h-14 items-center justify-between px-3 sm:px-6">
          <Skeleton className="h-4 w-24 rounded-full bg-muted/70" />
          <Skeleton className="h-8 w-8 rounded-full bg-muted/70" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <DashboardSkeleton />
      </main>
    </div>
  );
}
