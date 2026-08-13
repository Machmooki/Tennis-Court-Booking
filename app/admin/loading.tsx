import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4 shrink-0 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-28" />
              <Skeleton className="mt-2 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent>
          <div className="flex h-72 w-full items-end justify-around gap-4 rounded-lg border border-dashed p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full rounded-t-md"
                style={{ height: `${40 + ((i * 17) % 55)}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
