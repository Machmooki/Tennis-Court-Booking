import { z } from "zod";
import { guestCheckoutSchema } from "@/lib/booking/schema";

const memberEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const memberRegisterSchema = z.object({
  email: memberEmailSchema,
  // Supabase Auth's own minimum is lower; 8 chars is our app-level floor.
  password: z.string().min(8, "Password must be at least 8 characters."),
  full_name: guestCheckoutSchema.shape.full_name,
  phone: guestCheckoutSchema.shape.phone,
});

export const memberSignInSchema = z.object({
  email: memberEmailSchema,
  password: z.string().min(1, "Password is required."),
});

export type MemberRegisterInput = z.infer<typeof memberRegisterSchema>;
export type MemberSignInInput = z.infer<typeof memberSignInSchema>;
