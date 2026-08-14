import { CourtSelector } from "@/components/booking/court-selector";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourtSlots } from "@/lib/booking/use-court-slots";
import type { CourtRow } from "@/types/database";

const SKELETON_SLOTS = 18;

export function SlotGrid({
  date,
  courts,
  selectedCourtId,
  onCourtChange,
}: {
  date: string;
  courts: CourtRow[];
  selectedCourtId: string;
  onCourtChange: (courtId: string) => void;
}) {
  const selectedCourt =
    courts.find((court) => court.id === selectedCourtId) ?? courts[0];

  if (!selectedCourt) {
    return (
      <section>
        <h2 className="mt-8 mb-4 text-2xl font-semibold">Available Times</h2>
        <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No courts are available for booking right now.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mt-8 mb-4 text-2xl font-semibold">Choose a Court</h2>
      <CourtSelector
        courts={courts}
        selectedCourtId={selectedCourt.id}
        onCourtChange={onCourtChange}
      />

      <AvailabilityTimeSlots date={date} court={selectedCourt} />
    </section>
  );
}

function AvailabilityTimeSlots({
  date,
  court,
}: {
  date: string;
  court: CourtRow;
}) {
  const {
    availability,
    error,
    isLoading,
    isValidating,
    isRealtimeConnected,
  } = useCourtSlots(date, court.id);
  const showSkeleton = isLoading || isValidating;

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Available Times</h2>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`size-2 rounded-full transition-all ${
              isRealtimeConnected ? "bg-emerald-500" : "bg-muted-foreground/40"
            }`}
          />
          {showSkeleton
            ? "Loading…"
            : isRealtimeConnected
              ? "Live"
              : "Connecting…"}
        </div>
      </div>

      {showSkeleton ? (
        <TimeSlotGridSkeleton courtName={court.name} />
      ) : error ? (
        <div
          className="rounded-3xl border border-dashed p-10 text-center text-sm text-destructive"
          role="alert"
        >
          We couldn&apos;t load these time slots. Please try again.
        </div>
      ) : (
        <TimeSlotGrid date={date} court={court} availability={availability} />
      )}
    </div>
  );
}

function TimeSlotGridSkeleton({ courtName }: { courtName: string }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 min-[380px]:grid-cols-3 sm:grid-cols-4"
      aria-label={`Loading ${courtName} available times`}
      aria-busy="true"
    >
      {Array.from({ length: SKELETON_SLOTS }).map((_, index) => (
        <Skeleton key={index} className="h-11 rounded-full" />
      ))}
    </div>
  );
}
