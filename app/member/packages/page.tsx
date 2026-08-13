import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberNav } from "@/components/member/member-nav";
import { BackButton } from "@/components/ui/back-button";
import { PackageList } from "@/components/member/packages/package-list";
import { PackageListSkeleton } from "@/components/member/packages/package-list-skeleton";

export default async function MemberPackagesPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/member/login?redirect=/member/packages");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <MemberNav email={userData.user.email ?? null} />
      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Buy Credit Packages
            </h1>
            <p className="text-sm text-muted-foreground">
              Top up your hour wallet — credit lands automatically once
              payment is confirmed.
            </p>
          </div>
        </div>

        <Suspense fallback={<PackageListSkeleton />}>
          <PackageList />
        </Suspense>
      </main>
    </div>
  );
}
