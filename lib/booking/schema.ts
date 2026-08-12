import { z } from "zod";

// Canonical phone form is digits-only (no `+`, spaces, dashes, or parens) so
// that two different guests can never be silently merged into one
// `customers` row (unique on `phone`) just because they typed the same
// number with different punctuation, and so the anti-spam pending-bookings
// check in `process_guest_booking` reliably matches repeat guests.
const PHONE_REGEX = /^\d{8,15}$/;

export const guestCheckoutSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name is too long."),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(
      z
        .string()
        .regex(PHONE_REGEX, "Enter a valid phone number (8-15 digits).")
    ),
});

export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>;

export const selectedSlotSchema = z.object({
  courtId: z.string().uuid(),
  startIso: z.string().datetime(),
});

// All booking ids from one checkout are paid together in a single Stripe
// PaymentIntent (see app/booking/payment-actions.ts), whose metadata stores
// them as a comma-joined string subject to Stripe's 500-char metadata value
// limit (~13 uuids' worth) - matches the same cap enforced server-side in
// `create_payment_intent` (supabase/migrations/20260813000000_batch_payment_rpcs.sql).
export const MAX_BOOKING_SLOTS = 10;

// Shared by app/booking/payment-actions.ts (creating one PaymentIntent for a
// batch of bookings) and app/booking/payment/page.tsx (parsing `?ids=`).
export const bookingIdsSchema = z
  .array(z.string().uuid("Invalid booking reference."))
  .min(1, "At least one booking id is required.")
  .max(
    MAX_BOOKING_SLOTS,
    `You can pay for at most ${MAX_BOOKING_SLOTS} bookings at once.`
  );

export const createBookingsSchema = z.object({
  full_name: guestCheckoutSchema.shape.full_name,
  phone: guestCheckoutSchema.shape.phone,
  slots: z
    .array(selectedSlotSchema)
    .min(1, "Select at least one time slot.")
    .max(
      MAX_BOOKING_SLOTS,
      `You can book at most ${MAX_BOOKING_SLOTS} slots at once.`
    ),
});
