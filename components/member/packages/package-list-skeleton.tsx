import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Fallback for `<PackageList>` - mimics the package card grid. */
export function PackageListSkeleton() {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="rounded-3xl">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-28 rounded-full bg-muted/70" />
              <Skeleton className="h-5 w-20 rounded-full bg-muted/60" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg bg-muted/70" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-32 rounded-full bg-muted/60" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-11 w-full rounded-full bg-muted/70" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
