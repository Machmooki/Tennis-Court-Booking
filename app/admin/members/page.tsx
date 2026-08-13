import { createClient } from "@/lib/supabase/server";
import { MembersTable } from "@/components/admin/members/members-table";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("customers")
    .select(
      "id, full_name, phone, wallet_hours_all_time, wallet_hours_off_peak"
    )
    .not("auth_user_id", "is", null)
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load members: ${error.message}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground">
          View registered members and adjust hour-credit balances (e.g. cash
          package sales at the counter).
        </p>
      </div>

      <MembersTable members={members ?? []} />
    </div>
  );
}
