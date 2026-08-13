import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { SignOutButton } from "@/components/sign-out-button";

export function MemberNav({ email }: { email: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-6">
        <Link
          href="/member/dashboard"
          className="text-sm font-semibold tracking-tight"
        >
          My Account
        </Link>

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
