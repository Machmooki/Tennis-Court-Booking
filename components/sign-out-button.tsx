"use client";

import { useFormStatus } from "react-dom";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// `useFormStatus` only reports its parent `<form>`'s pending state when
// called from a component *nested inside* that form, not the component that
// renders the form itself - hence this small dedicated component, shared by
// the admin and member nav bars (both wrap it in `<form action={signOut}>`).
export function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className="h-11 w-11"
      disabled={pending}
      aria-label="Sign out"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
    </Button>
  );
}
