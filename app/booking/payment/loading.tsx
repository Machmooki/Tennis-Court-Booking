import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookingPaymentLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl p-4">
      <div className="mb-4 space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="h-px bg-border" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-[220px] w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
