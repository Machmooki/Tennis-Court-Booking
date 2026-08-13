import Link from "next/link";
import { Sparkles } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export async function MemberNav({ email }: { email: string | null }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const role = (data.user?.app_metadata as { role?: unknown } | undefined)
    ?.role;
  const isAdmin = role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/member/dashboard"
            className="text-sm font-semibold tracking-tight"
          >
            My Account
          </Link>
          <Link
            href="/member/packages"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Sparkles className="size-3.5" />
            <span className="hidden sm:inline">Buy Credits</span>
            <span className="sm:hidden">Credits</span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
            >
              <span aria-hidden="true">👑</span>
              <span className="hidden sm:inline">Admin Panel</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {email && (
            <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:inline">
              {email}
            </span>
          )}
          <form action={signOut}>
            <SignOutButton />
          </form>
        </div>
      </div>
    </header>
  );
}
