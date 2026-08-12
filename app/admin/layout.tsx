import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  if (!admin) {
    // Distinguish "not signed in" from "signed in but not admin" for clearer UX.
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      await supabase.auth.signOut();
      redirect("/login?error=not_admin");
    }

    redirect("/login?redirect=/admin");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminNav email={admin.email} />
      <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
