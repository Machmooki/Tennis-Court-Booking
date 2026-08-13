"use client";

import { useActionState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerMember,
  type RegisterMemberResult,
} from "@/app/member/register/actions";

const initialState: RegisterMemberResult = {};

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerMember,
    initialState
  );

  if (state.needsEmailConfirmation) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <MailCheck className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">
          Check your email to confirm your account, then sign in.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          required
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="0812345678"
          required
          className="h-11"
        />
      </div>

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
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full gap-2"
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
