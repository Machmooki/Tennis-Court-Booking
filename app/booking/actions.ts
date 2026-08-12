"use server";

import { createClient } from "@/lib/supabase/server";
import { createBookingsSchema } from "@/lib/booking/schema";
import { getSlotPrice } from "@/lib/booking/pricing";
import { SLOT_DURATION_MINUTES } from "@/lib/booking/slots";

export interface BookingAttemptResult {
  courtId: string;
  startIso: string;
  success: boolean;
  bookingId?: string;
  error?: string;
  errorType?: "anti_spam" | "conflict" | "unknown";
}

export type CreateBookingsResult =
  | { error: string; results?: undefined }
  | { error?: undefined; results: BookingAttemptResult[] };

// Matches the wording of the two guarded failure modes raised inside
// `process_guest_booking` (see the Phase 1 migration) so the UI can show a
// specific, friendly message instead of the raw Postgres error text.
function classifyRpcError(message: string): BookingAttemptResult["errorType"] {
  const lower = message.toLowerCase();
  if (lower.includes("pending booking")) return "anti_spam";
  if (lower.includes("already booked") || lower.includes("pending confirmation")) {
    return "conflict";
  }
  return "unknown";
}

export async function createGuestBookings(
  _prevState: CreateBookingsResult,
  formData: FormData
): Promise<CreateBookingsResult> {
  const rawSlots = formData.get("slots");
  let slots: unknown;
  try {
    slots = JSON.parse(typeof rawSlots === "string" ? rawSlots : "[]");
  } catch {
    return { error: "Invalid slot selection. Please try again." };
  }

  const parsed = createBookingsSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    slots,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { full_name, phone, slots: selectedSlots } = parsed.data;
  const supabase = await createClient();

  // Never trust a client-supplied price: look up each court's real
  // peak/off-peak pricing and recompute the total server-side below.
  const courtIds = [...new Set(selectedSlots.map((s) => s.courtId))];
  const { data: courts, error: courtsError } = await supabase
    .from("courts")
    .select("id, name, peak_price, off_peak_price")
    .in("id", courtIds);

  if (courtsError) {
    return { error: `Failed to load court pricing: ${courtsError.message}` };
  }

  const courtsById = new Map((courts ?? []).map((court) => [court.id, court]));
  const results: BookingAttemptResult[] = [];

  for (const slot of selectedSlots) {
    const court = courtsById.get(slot.courtId);
    if (!court) {
      results.push({
        courtId: slot.courtId,
        startIso: slot.startIso,
        success: false,
        error: "This court is no longer available.",
        errorType: "unknown",
      });
      continue;
    }

    // The client only sends a start time; the slot duration (and therefore
    // the end time) is always derived server-side.
    const start = new Date(slot.startIso);
    const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60_000);
    const totalPrice = getSlotPrice(court, slot.startIso);

    const { data: bookingId, error: rpcError } = await supabase.rpc(
      "process_guest_booking",
      {
        p_phone: phone,
        p_full_name: full_name,
        p_court_id: slot.courtId,
        p_start_time: start.toISOString(),
        p_end_time: end.toISOString(),
        p_total_price: totalPrice,
      }
    );

    if (rpcError) {
      results.push({
        courtId: slot.courtId,
        startIso: slot.startIso,
        success: false,
        error: rpcError.message,
        errorType: classifyRpcError(rpcError.message),
      });
      continue;
    }

    results.push({
      courtId: slot.courtId,
      startIso: slot.startIso,
      success: true,
      bookingId: bookingId ?? undefined,
    });
  }

  return { results };
}
