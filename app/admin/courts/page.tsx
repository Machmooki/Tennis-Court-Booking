import { createClient } from "@/lib/supabase/server";
import { CourtFormDialog } from "@/components/admin/courts/court-form-dialog";
import { CourtsTable } from "@/components/admin/courts/courts-table";

export default async function AdminCourtsPage() {
  const supabase = await createClient();
  const { data: courts, error } = await supabase
    .from("courts")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load courts: ${error.message}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courts</h1>
          <p className="text-sm text-muted-foreground">
            Manage the courts available for booking.
          </p>
        </div>
        <CourtFormDialog mode="create" />
      </div>

      <CourtsTable courts={courts ?? []} />
    </div>
  );
}
