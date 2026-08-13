import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_COURTS = 4;
const SKELETON_ROWS = 10;

export default function AdminBookingsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
        <Skeleton className="h-11 w-36 rounded-lg" />
        <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
        <Skeleton className="h-11 w-16 rounded-lg" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `76px repeat(${SKELETON_COURTS}, minmax(112px, 1fr))`,
          }}
        >
          <div className="border-b bg-card" />
          {Array.from({ length: SKELETON_COURTS }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center border-b border-l bg-card p-2"
            >
              <Skeleton className="h-4 w-14" />
            </div>
          ))}

          {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
            <div key={rowIndex} className="contents">
              <div className="flex items-center justify-end border-b bg-card px-2">
                <Skeleton className="h-3 w-9" />
              </div>
              {Array.from({ length: SKELETON_COURTS }).map((_, colIndex) => (
                <div key={colIndex} className="border-b border-l p-1">
                  <Skeleton className="h-11 w-full rounded-md" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
