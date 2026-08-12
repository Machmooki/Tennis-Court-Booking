"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type CourtActionResult = { error: string } | { error?: undefined };

const courtSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  peak_price: z.coerce.number().min(0, "Peak price must be 0 or more."),
  off_peak_price: z.coerce
    .number()
    .min(0, "Off-peak price must be 0 or more."),
  is_active: z.coerce.boolean(),
});

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error("Not authorized.");
  }
}

function parseCourtForm(formData: FormData) {
  return courtSchema.safeParse({
    name: formData.get("name"),
    peak_price: formData.get("peak_price"),
    off_peak_price: formData.get("off_peak_price"),
    is_active: formData.get("is_active") === "on",
  });
}

export async function createCourt(
  _prevState: CourtActionResult,
  formData: FormData
): Promise<CourtActionResult> {
  await requireAdmin();

  const parsed = parseCourtForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("courts").insert(parsed.data);

  if (error) return { error: error.message };

  revalidatePath("/admin/courts");
  return {};
}

export async function updateCourt(
  courtId: string,
  _prevState: CourtActionResult,
  formData: FormData
): Promise<CourtActionResult> {
  await requireAdmin();

  const parsed = parseCourtForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .update(parsed.data)
    .eq("id", courtId);

  if (error) return { error: error.message };

  revalidatePath("/admin/courts");
  return {};
}

export async function setCourtActive(courtId: string, isActive: boolean) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .update({ is_active: isActive })
    .eq("id", courtId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/courts");
}

export async function deleteCourt(courtId: string) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("courts").delete().eq("id", courtId);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "This court has existing bookings and can't be deleted. Deactivate it instead."
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/courts");
}
