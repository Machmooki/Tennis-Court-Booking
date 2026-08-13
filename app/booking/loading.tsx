import { Skeleton } from "@/components/ui/skeleton";

// Matches `getDaySlots()` (06:00–00:00, hourly) so the skeleton count lines
// up with the real time grid and there is no vertical jump once data arrives.
const SKELETON_SLOTS = 18;

export default function BookingLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-card/80">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Skeleton className="h-4 w-24 rounded-full bg-muted/70" />
          <Skeleton className="h-9 w-24 rounded-full bg-muted/70" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="flex justify-center pt-2">
          <Skeleton className="h-9 w-52 rounded-full" />
        </div>

        <div className="flex gap-4 overflow-hidden px-2 py-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`date-${index}`}
              className="h-[90px] min-w-[70px] rounded-3xl"
            />
          ))}
        </div>

        <div>
          <Skeleton className="mt-8 mb-4 h-8 w-44" />
          <div className="flex gap-2 overflow-hidden py-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={`court-${index}`}
                className="h-11 min-w-24 rounded-full"
              />
            ))}
          </div>

          <div className="mt-8 mb-4 flex items-center justify-between">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 min-[380px]:grid-cols-3 sm:grid-cols-4">
            {Array.from({ length: SKELETON_SLOTS }).map((_, index) => (
              <Skeleton key={`slot-${index}`} className="h-11 rounded-full" />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}
