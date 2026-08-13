import { Skeleton } from "@/components/ui/skeleton";

// Matches `getDaySlots()` (06:00–22:00, hourly) and a typical 3-court
// layout, so the skeleton grid's row/column count lines up with the real
// `<SlotGrid>` and there's no layout jump once data arrives.
const SKELETON_ROWS = 16;
const SKELETON_COLUMNS = 3;

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

        <div className="flex items-center gap-2">
          <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
          <Skeleton className="h-11 flex-1 rounded-lg" />
          <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />

          <div className="overflow-x-auto rounded-lg border">
            <div
              className="grid min-w-max"
              style={{
                gridTemplateColumns: `72px repeat(${SKELETON_COLUMNS}, minmax(84px, 1fr))`,
              }}
            >
              <div className="border-b bg-card" />
              {Array.from({ length: SKELETON_COLUMNS }).map((_, i) => (
                <div
                  key={`header-${i}`}
                  className="flex items-center justify-center border-b border-l bg-card p-2"
                >
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}

              {Array.from({ length: SKELETON_ROWS }).map((_, row) => (
                <div key={`row-${row}`} className="contents">
                  <div className="flex items-center justify-end border-b bg-card px-2">
                    <Skeleton className="h-3 w-10" />
                  </div>
                  {Array.from({ length: SKELETON_COLUMNS }).map((_, col) => (
                    <div
                      key={`cell-${row}-${col}`}
                      className="border-b border-l p-1"
                    >
                      <Skeleton className="h-11 w-full rounded-md" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
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
