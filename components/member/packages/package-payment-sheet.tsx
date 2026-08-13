"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PaymentPanel } from "@/components/booking/payment-panel";
import { createPackagePaymentIntent } from "@/app/member/packages/actions";
import { formatCurrency } from "@/lib/format";
import type { PackageCardData } from "@/components/member/packages/package-card";

interface PackagePaymentSheetProps {
  pkg: PackageCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The "detail" half of the package store's Master-Detail layout. Stays
 * mounted/open as long as a package is selected. `<PackageCheckout>` below
 * is keyed by package id (+ a retry token) so switching packages - or
 * retrying after an error - remounts it fresh instead of resetting shared
 * state from inside an effect.
 */
export function PackagePaymentSheet({
  pkg,
  open,
  onOpenChange,
}: PackagePaymentSheetProps) {
  const [retryToken, setRetryToken] = useState(0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{pkg?.name ?? "Buy credits"}</SheetTitle>
          <SheetDescription>
            {pkg
              ? `${formatCurrency(pkg.price_thb)} for ${pkg.credit_hours} ${
                  pkg.credit_hours === 1 ? "hour" : "hours"
                }`
              : "Select a package to get started."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {pkg && (
            <PackageCheckout
              key={`${pkg.id}-${retryToken}`}
              pkg={pkg}
              onRetry={() => setRetryToken((t) => t + 1)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type CheckoutState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; clientSecret: string; amount: number }
  | { status: "success" };

function PackageCheckout({
  pkg,
  onRetry,
}: {
  pkg: PackageCardData;
  onRetry: () => void;
}) {
  const [state, setState] = useState<CheckoutState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void createPackagePaymentIntent(pkg.id).then((result) => {
      if (cancelled) return;
      if (!result.data) {
        setState({
          status: "error",
          message: result.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      setState({
        status: "ready",
        clientSecret: result.data.clientSecret,
        amount: result.data.amount,
      });
    });

    return () => {
      cancelled = true;
    };
    // This component is remounted (via `key`) whenever the selected package
    // or retry token changes, so this effect only ever runs once per mount -
    // no reset-on-change logic needed here.
  }, [pkg.id]);

  function handleSuccess() {
    toast.success(`${pkg.credit_hours} hours added to your wallet!`);
    setState({ status: "success" });
  }

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-14 text-emerald-500" />
        <p className="text-lg font-semibold">Payment successful!</p>
        <p className="text-sm text-muted-foreground">
          {pkg.credit_hours} hours are on their way to your wallet.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/member/dashboard" />}
          className="mt-2 h-11 rounded-full"
        >
          View wallet
        </Button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full"
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        Preparing payment…
      </div>
    );
  }

  return (
    <PaymentPanel
      clientSecret={state.clientSecret}
      amount={state.amount}
      onSuccess={handleSuccess}
    />
  );
}
