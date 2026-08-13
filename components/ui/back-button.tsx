"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Small ghost "back" button for sub-pages (e.g. `/member/packages`).
 * `router.back()` is wrapped in `startTransition` so the click stays
 * responsive even while the previous route's Suspense boundaries are still
 * resolving in the background.
 */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Go back"
      className={cn("rounded-full", className)}
      onClick={() => {
        startTransition(() => {
          router.back();
        });
      }}
    >
      <ArrowLeft className="size-4" />
    </Button>
  );
}
