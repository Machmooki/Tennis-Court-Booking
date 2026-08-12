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

export const createBookingsSchema = z.object({
  full_name: guestCheckoutSchema.shape.full_name,
  phone: guestCheckoutSchema.shape.phone,
  slots: z.array(selectedSlotSchema).min(1, "Select at least one time slot."),
});
