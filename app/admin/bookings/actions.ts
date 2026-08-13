"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { guestCheckoutSchema } from "@/lib/booking/schema";

export type BookingActionResult = { error: string } | { error?: undefined };

// Matches the system customer row seeded by
// `supabase/migrations/20260813080000_admin_grid_blocked_status.sql`, used
// to satisfy `bookings.customer_id`'s NOT NULL constraint for slots an admin
// has taken offline rather than a real customer booking.
const SYSTEM_BLOCKED_CUSTOMER_PHONE = "0000000000";
const SYSTEM_BLOCKED_CUSTOMER_NAME = "Court Blocked (System)";

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error("Not authorized.");
  }
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Postgres exclusion-constraint violation code for `bookings_no_overlap`. */
function friendlyBookingError(error: { code?: string; message: string }) {
  return error.code === "23P01"
    ? "This slot was just taken by another booking. Please refresh and try again."
    : error.message;
}

async function getOrCreateSystemBlockCustomerId(
  supabase: SupabaseServerClient
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", SYSTEM_BLOCKED_CUSTOMER_PHONE)
    .maybeSingle();

  if (existing) return existing.id;

  // Self-healing fallback in case the seed row from the migration is ever
  // missing (e.g. a fresh environment where migrations ran out of order).
  const { data: created, error } = await supabase
    .from("customers")
    .upsert(
      { phone: SYSTEM_BLOCKED_CUSTOMER_PHONE, full_name: SYSTEM_BLOCKED_CUSTOMER_NAME },
      { onConflict: "phone" }
    )
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

const timeRangeSchema = z
  .object({
    courtId: z.string().uuid("Invalid court."),
    startTime: z.string().min(1, "Invalid start time."),
    endTime: z.string().min(1, "Invalid end time."),
  })
  .refine((value) => new Date(value.endTime) > new Date(value.startTime), {
    message: "End time must be after the start time.",
    path: ["endTime"],
  });

const manualBookingSchema = timeRangeSchema.and(
  z.object({
    fullName: guestCheckoutSchema.shape.full_name,
    phone: guestCheckoutSchema.shape.phone,
    price: z.coerce.number().min(0, "Price must be 0 or more."),
  })
);

const blockSlotSchema = timeRangeSchema.and(
  z.object({
    reason: z
      .string()
      .trim()
      .min(3, "Reason must be at least 3 characters.")
      .max(300, "Reason is too long."),
  })
);

const cancelSchema = z.object({
  bookingId: z.string().uuid("Invalid booking."),
});

/**
 * Admin-only manual booking: bypasses the guest anti-spam RPC entirely and
 * inserts a `confirmed` booking directly (e.g. a walk-in / phone booking).
 * Relies on the "Admins manage all bookings"/"...customers" RLS policies
 * (Phase 1) rather than a service-role client, so a non-admin session can
 * never call this successfully even if `requireAdmin()` were bypassed.
 */
export async function createManualBooking(
  courtId: string,
  startTime: string,
  endTime: string,
  fullName: string,
  phone: string,
  price: number
): Promise<BookingActionResult> {
  await requireAdmin();

  const parsed = manualBookingSchema.safeParse({
    courtId,
    startTime,
    endTime,
    fullName,
    phone,
    price,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      { phone: parsed.data.phone, full_name: parsed.data.fullName },
      { onConflict: "phone" }
    )
    .select("id")
    .single();

  if (customerError || !customer) {
    return {
      error: customerError?.message ?? "Failed to save the customer.",
    };
  }

  const { error: bookingError } = await supabase.from("bookings").insert({
    customer_id: customer.id,
    court_id: parsed.data.courtId,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    total_price: parsed.data.price,
    status: "confirmed",
  });

  if (bookingError) {
    return { error: friendlyBookingError(bookingError) };
  }

  revalidatePath("/admin/bookings");
  return {};
}

/**
 * Takes a slot offline (maintenance, private event, etc.) by inserting a
 * `blocked` booking against the system customer. Reuses the same overlap
 * exclusion constraint as real bookings, so it can never silently double up
 * with a pending/confirmed/blocked slot.
 */
export async function blockCourtSlot(
  courtId: string,
  startTime: string,
  endTime: string,
  reason: string
): Promise<BookingActionResult> {
  await requireAdmin();

  const parsed = blockSlotSchema.safeParse({
    courtId,
    startTime,
    endTime,
    reason,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  const systemCustomerId = await getOrCreateSystemBlockCustomerId(supabase);
  if (!systemCustomerId) {
    return { error: "Failed to prepare the block record. Please try again." };
  }

  const { error: bookingError } = await supabase.from("bookings").insert({
    customer_id: systemCustomerId,
    court_id: parsed.data.courtId,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    total_price: 0,
    status: "blocked",
    note: parsed.data.reason,
  });

  if (bookingError) {
    return { error: friendlyBookingError(bookingError) };
  }

  revalidatePath("/admin/bookings");
  return {};
}

/**
 * Cancels an existing booking OR unblocks a blocked slot - both are just a
 * transition to `status = 'cancelled'`, which immediately frees the slot in
 * both the admin grid and the public `court_availability` view.
 */
export async function cancelAdminBooking(
  bookingId: string
): Promise<BookingActionResult> {
  await requireAdmin();

  const parsed = cancelSchema.safeParse({ bookingId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.bookingId);

  if (error) return { error: error.message };

  revalidatePath("/admin/bookings");
  return {};
}
