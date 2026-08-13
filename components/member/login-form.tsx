"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInMember, type SignInMemberResult } from "@/app/member/login/actions";

const initialState: SignInMemberResult = {};

export function MemberLoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(
    signInMember,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="h-11 w-full gap-2">
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
