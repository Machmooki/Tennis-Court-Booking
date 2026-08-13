import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberNav } from "@/components/member/member-nav";
import { DashboardData } from "@/components/member/dashboard-data";
import { DashboardSkeleton } from "@/components/member/dashboard-skeleton";

export default async function MemberDashboardPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/member/login?redirect=/member/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <MemberNav email={userData.user.email ?? null} />
      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        {/* The auth check above is the only thing that has to block - the
        wallet/booking queries stream in below so the shell paints instantly
        even on a cold Vercel lambda. */}
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardData authUserId={userData.user.id} />
        </Suspense>
      </main>
    </div>
  );
}
