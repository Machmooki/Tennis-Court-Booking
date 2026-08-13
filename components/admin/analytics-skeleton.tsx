import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback for `<AnalyticsData>` - mimics the 3 metric cards + chart card
 * only. The page header is real static markup rendered outside the
 * Suspense boundary, so it never needs to be faked here.
 */
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="rounded-2xl">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <Skeleton className="h-4 w-24 rounded-full bg-muted/70" />
              <Skeleton className="size-4 shrink-0 rounded-full bg-muted/70" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-28 rounded-lg bg-muted/70" />
              <Skeleton className="mt-2 h-3 w-20 rounded-full bg-muted/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-40 rounded-full bg-muted/70" />
          <Skeleton className="h-4 w-64 max-w-full rounded-full bg-muted/60" />
        </CardHeader>
        <CardContent>
          <div className="flex h-72 w-full items-end justify-around gap-4 rounded-lg border border-dashed p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full rounded-t-md bg-muted/60"
                style={{ height: `${40 + ((i * 17) % 55)}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
