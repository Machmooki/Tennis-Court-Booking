"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PackageActionResult = { error: string } | { error?: undefined };

const packageSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  price_thb: z.coerce
    .number()
    .int("Price must be a whole number.")
    .min(0, "Price must be 0 or more."),
  credit_hours: z.coerce
    .number()
    .int("Credit hours must be a whole number.")
    .min(1, "Credit hours must be at least 1."),
  usable_at: z.enum(["all_times", "off_peak"], {
    error: "Usable times must be All Times or Off-Peak Only.",
  }),
  is_active: z.coerce.boolean(),
});

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error("Not authorized.");
  }
}

function parsePackageForm(formData: FormData) {
  return packageSchema.safeParse({
    name: formData.get("name"),
    price_thb: formData.get("price_thb"),
    credit_hours: formData.get("credit_hours"),
    usable_at: formData.get("usable_at"),
    is_active: formData.get("is_active") === "on",
  });
}

export async function createPackage(
  _prevState: PackageActionResult,
  formData: FormData
): Promise<PackageActionResult> {
  await requireAdmin();

  const parsed = parsePackageForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("packages").insert(parsed.data);

  if (error) return { error: error.message };

  revalidatePath("/admin/packages");
  return {};
}

export async function updatePackage(
  packageId: string,
  _prevState: PackageActionResult,
  formData: FormData
): Promise<PackageActionResult> {
  await requireAdmin();

  const parsed = parsePackageForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("packages")
    .update(parsed.data)
    .eq("id", packageId);

  if (error) return { error: error.message };

  revalidatePath("/admin/packages");
  return {};
}

export async function setPackageActive(packageId: string, isActive: boolean) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("packages")
    .update({ is_active: isActive })
    .eq("id", packageId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/packages");
}

export async function deletePackage(packageId: string) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("packages")
    .delete()
    .eq("id", packageId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/packages");
}
