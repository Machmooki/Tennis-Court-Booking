"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { getDayRangeUTC } from "@/lib/date";
import { slotKey } from "@/lib/booking/slots";
import type {
  BookingStatus,
  CourtAvailabilityRow,
} from "@/types/database";

const AVAILABILITY_TOPIC = "bookings-availability";
const BROADCAST_EVENTS = ["INSERT", "UPDATE", "DELETE"] as const;

interface AvailabilityBroadcastPayload {
  operation: (typeof BROADCAST_EVENTS)[number];
  court_id: string;
  start_time: string;
}

export type AvailabilityMap = Map<string, BookingStatus>;

async function fetchCourtSlots(date: string, courtId: string) {
  const supabase = createClient();
  const { startIso, endIso } = getDayRangeUTC(date);
  const { data, error } = await supabase
    .from("court_availability")
    .select("court_id, start_time, end_time, status")
    .eq("court_id", courtId)
    .gte("start_time", startIso)
    .lt("start_time", endIso)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to load court availability: ${error.message}`);
  }

  return (data ?? []) as CourtAvailabilityRow[];
}

/**
 * Per-court, per-day availability cache. Each date/court combination gets an
 * independent SWR entry, so returning to a previously viewed grid is instant.
 * Realtime events revalidate only the currently visible combination.
 */
export function useCourtSlots(date: string, courtId: string) {
  const key = courtId ? `court-slots:${date}:${courtId}` : null;
  const swr = useSWR<CourtAvailabilityRow[]>(
    key,
    () => fetchCourtSlots(date, courtId),
    {
      keepPreviousData: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
  const { mutate } = swr;
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    if (!courtId) return;

    const supabase = createClient();
    const { startIso, endIso } = getDayRangeUTC(date);
    const channel = supabase.channel(AVAILABILITY_TOPIC);

    function handleAvailabilityChange(payload: AvailabilityBroadcastPayload) {
      if (
        payload.court_id === courtId &&
        payload.start_time >= startIso &&
        payload.start_time < endIso
      ) {
        void mutate();
      }
    }

    for (const event of BROADCAST_EVENTS) {
      channel.on("broadcast", { event }, ({ payload }) => {
        handleAvailabilityChange(payload as AvailabilityBroadcastPayload);
      });
    }

    channel.subscribe((status) => {
      setIsRealtimeConnected(status === "SUBSCRIBED");
    });

    return () => {
      setIsRealtimeConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [courtId, date, mutate]);

  const availability = useMemo<AvailabilityMap>(() => {
    const map: AvailabilityMap = new Map();
    for (const row of swr.data ?? []) {
      map.set(slotKey(row.court_id, row.start_time), row.status);
    }
    return map;
  }, [swr.data]);

  return {
    availability,
    error: swr.error,
    isLoading: swr.isLoading,
    isValidating: swr.isValidating,
    isRealtimeConnected,
    mutate,
  };
}
