"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/admin/courts", label: "Courts", icon: LayoutGrid },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
] as const;

export function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-6">
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {email && (
            <span className="hidden max-w-40 truncate text-xs text-muted-foreground sm:inline">
              {email}
            </span>
          )}
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              className="h-11 w-11"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
