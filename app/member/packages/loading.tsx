import { Skeleton } from "@/components/ui/skeleton";
import { PackageListSkeleton } from "@/components/member/packages/package-list-skeleton";

// Route-level fallback while the page component itself is still being
// resolved - the page's own inline
// <Suspense fallback={<PackageListSkeleton />}> takes over after that.
export default function MemberPackagesLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="flex h-14 items-center justify-between px-3 sm:px-6">
          <Skeleton className="h-4 w-24 rounded-full bg-muted/70" />
          <Skeleton className="h-8 w-8 rounded-full bg-muted/70" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full bg-muted/70" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-lg bg-muted/70" />
            <Skeleton className="h-4 w-64 rounded-full bg-muted/60" />
          </div>
        </div>

        <PackageListSkeleton />
      </main>
    </div>
  );
}
