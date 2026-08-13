"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AdjustWalletResult =
  | { error: string; data?: undefined }
  | {
      error?: undefined;
      data: {
        walletHoursAllTime: number;
        walletHoursOffPeak: number;
      };
    };

const adjustWalletSchema = z
  .object({
    customerId: z.string().uuid("Invalid member."),
    allTimeChange: z.coerce.number().int("All-Time change must be a whole number."),
    offPeakChange: z.coerce.number().int("Off-Peak change must be a whole number."),
    reason: z
      .string()
      .trim()
      .min(3, "Reason must be at least 3 characters.")
      .max(300, "Reason is too long."),
  })
  .refine(
    (value) => value.allTimeChange !== 0 || value.offPeakChange !== 0,
    { message: "At least one wallet bucket must change.", path: ["allTimeChange"] }
  );

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error("Not authorized.");
  }
}

/**
 * Admin-only counter adjustment: credit or claw back hour wallets for a
 * registered member. Atomic deduct/credit + ledger write lives in the
 * `admin_adjust_wallet` RPC (is_admin gated, row-locked).
 */
export async function adjustWalletBalance(
  customerId: string,
  allTimeChange: number,
  offPeakChange: number,
  reason: string
): Promise<AdjustWalletResult> {
  await requireAdmin();

  const parsed = adjustWalletSchema.safeParse({
    customerId,
    allTimeChange,
    offPeakChange,
    reason,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("admin_adjust_wallet", {
      p_customer_id: parsed.data.customerId,
      p_all_time_change: parsed.data.allTimeChange,
      p_off_peak_change: parsed.data.offPeakChange,
      p_reason: parsed.data.reason,
    })
    .single();

  if (error) {
    console.error("[adjustWalletBalance] RPC failed:", error.message);
    return { error: error.message };
  }
  if (!data) {
    return { error: "Adjustment failed. Please try again." };
  }

  revalidatePath("/admin/members");
  return {
    data: {
      walletHoursAllTime: data.wallet_hours_all_time,
      walletHoursOffPeak: data.wallet_hours_off_peak,
    },
  };
}
