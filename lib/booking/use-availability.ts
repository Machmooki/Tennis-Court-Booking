"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDayRangeUTC } from "@/lib/date";
import { slotKey } from "@/lib/booking/slots";
import type { BookingStatus } from "@/types/database";

// Must match the topic/event names used by the `bookings_broadcast_availability`
// trigger in `supabase/migrations/20260811010000_booking_availability.sql`.
const AVAILABILITY_TOPIC = "bookings-availability";
const BROADCAST_EVENTS = ["INSERT", "UPDATE", "DELETE"] as const;

interface AvailabilityBroadcastPayload {
  operation: (typeof BROADCAST_EVENTS)[number];
  booking_id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

export type AvailabilityMap = Map<string, BookingStatus>;

/**
 * Loads today-of-interest booking occupancy from the public
 * `court_availability` view, then keeps it live via a Realtime broadcast
 * channel populated by a database trigger. See the Phase 3 migration for
 * why this uses Broadcast-from-Database instead of Postgres Changes (guests
 * have no RLS SELECT access to `bookings`, only to the sanitized view).
 */
export function useAvailability(
  isoDate: string,
  initialAvailability?: Record<string, BookingStatus>
) {
  const [availability, setAvailability] = useState<AvailabilityMap>(() =>
    initialAvailability
      ? new Map(Object.entries(initialAvailability))
      : new Map()
  );
  const [loadedDate, setLoadedDate] = useState<string | null>(() =>
    initialAvailability ? isoDate : null
  );
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const dateRangeRef = useRef(getDayRangeUTC(isoDate));
  const isLoading = loadedDate !== isoDate;

  useEffect(() => {
    const range = getDayRangeUTC(isoDate);
    dateRangeRef.current = range;

    // Server already hydrated this date - skip the duplicate client fetch.
    if (initialAvailability && loadedDate === isoDate) {
      return;
    }

    const supabase = createClient();
    let isCancelled = false;

    supabase
      .from("court_availability")
      .select("court_id, start_time, status")
      .gte("start_time", range.startIso)
      .lt("start_time", range.endIso)
      .then(({ data, error }) => {
        if (isCancelled) return;

        if (error) {
          console.error(
            "[useAvailability] failed to load availability:",
            error.message
          );
          setAvailability(new Map());
        } else {
          const map: AvailabilityMap = new Map();
          for (const row of data ?? []) {
            map.set(slotKey(row.court_id, row.start_time), row.status);
          }
          setAvailability(map);
        }
        setLoadedDate(isoDate);
      });

    return () => {
      isCancelled = true;
    };
    // `initialAvailability` / `loadedDate` are intentionally omitted: we only
    // want to refetch when the calendar date changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoDate]);

  useEffect(() => {
    const supabase = createClient();

    function applyEvent(payload: AvailabilityBroadcastPayload) {
      const { startIso, endIso } = dateRangeRef.current;
      if (payload.start_time < startIso || payload.start_time >= endIso) {
        return;
      }

      setAvailability((prev) => {
        const next = new Map(prev);
        const key = slotKey(payload.court_id, payload.start_time);

        if (payload.operation === "DELETE" || payload.status === "cancelled") {
          next.delete(key);
        } else {
          next.set(key, payload.status);
        }

        return next;
      });
    }

    const channel = supabase.channel(AVAILABILITY_TOPIC);
    for (const event of BROADCAST_EVENTS) {
      channel.on("broadcast", { event }, ({ payload }) =>
        applyEvent(payload as AvailabilityBroadcastPayload)
      );
    }
    channel.subscribe((status) => {
      setIsRealtimeConnected(status === "SUBSCRIBED");
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { availability, isLoading, isRealtimeConnected };
}
