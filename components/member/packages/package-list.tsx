import { createClient } from "@/lib/supabase/server";
import { PackageStore } from "@/components/member/packages/package-store";

/**
 * The DB round trip for the storefront - rendered inside a `<Suspense>`
 * boundary in `page.tsx` so the header/back button paint instantly while
 * this streams in.
 */
export async function PackageList() {
  const supabase = await createClient();
  const { data: packages, error } = await supabase
    .from("packages")
    .select("id, name, price_thb, credit_hours, usable_at")
    .eq("is_active", true)
    .order("price_thb", { ascending: true });

  if (error) {
    throw new Error(`Failed to load packages: ${error.message}`);
  }

  if (!packages || packages.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No packages are available right now. Please check back soon.
      </div>
    );
  }

  return <PackageStore packages={packages} />;
}
