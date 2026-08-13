import Link from "next/link";
import { LogIn, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

/**
 * The one DB round trip on the public booking page - rendered inside a
 * `<Suspense>` boundary in `page.tsx` so the slot grid never waits on it.
 * Guests see a cute "Sign In" pill; members see their name + wallet hours,
 * linking straight to their dashboard.
 */
export async function BookingAuthHeader() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return (
      <Button
        nativeButton={false}
        render={<Link href="/member/login?redirect=/booking" />}
        variant="outline"
        className="h-9 gap-1.5 rounded-full"
      >
        <LogIn className="size-3.5" />
        Sign In
      </Button>
    );
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("full_name, wallet_hours_all_time, wallet_hours_off_peak")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  const totalHours =
    (customer?.wallet_hours_all_time ?? 0) +
    (customer?.wallet_hours_off_peak ?? 0);

  return (
    <Link
      href="/member/dashboard"
      className="group flex items-center gap-2.5 rounded-full border bg-card py-1 pr-3 pl-1.5 transition-colors hover:bg-muted"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <User className="size-3.5" />
      </span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-medium">
          {customer?.full_name ?? "My Account"}
        </span>
        <span className="block text-xs text-muted-foreground">
          {totalHours} {totalHours === 1 ? "hour" : "hours"} available
        </span>
      </span>
    </Link>
  );
}
