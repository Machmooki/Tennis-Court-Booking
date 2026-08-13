import { createClient } from "@/lib/supabase/server";
import { PackageFormDialog } from "@/components/admin/packages/package-form-dialog";
import { PackagesTable } from "@/components/admin/packages/packages-table";

export default async function AdminPackagesPage() {
  const supabase = await createClient();
  const { data: packages, error } = await supabase
    .from("packages")
    .select("*")
    .order("credit_hours", { ascending: true });

  if (error) {
    throw new Error(`Failed to load packages: ${error.message}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Packages</h1>
          <p className="text-sm text-muted-foreground">
            Configure hour-based credit packages members can purchase.
          </p>
        </div>
        <PackageFormDialog mode="create" />
      </div>

      <PackagesTable packages={packages ?? []} />
    </div>
  );
}
