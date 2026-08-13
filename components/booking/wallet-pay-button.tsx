"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { payWithWallet } from "@/app/booking/payment-actions";
import {
  getWalletDebitPreview,
  type WalletBalance,
  type WalletHoursBreakdown,
} from "@/lib/booking/pricing";

function hoursLabel(hours: number): string {
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function WalletPayButton({
  bookingIds,
  breakdown,
  balance,
  onSuccess,
}: {
  bookingIds: string[];
  breakdown: WalletHoursBreakdown;
  balance: WalletBalance;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const preview = getWalletDebitPreview(breakdown, balance);

  const deductionParts = [
    preview.allTimeDebit > 0
      ? `${hoursLabel(preview.allTimeDebit)} All-Time`
      : null,
    preview.offPeakDebit > 0
      ? `${hoursLabel(preview.offPeakDebit)} Off-Peak`
      : null,
  ].filter(Boolean);

  function handlePay() {
    startTransition(async () => {
      const result = await payWithWallet(bookingIds);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Paid with wallet credit!");
      onSuccess();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wallet className="size-4 text-primary" />
        Pay with wallet credit
      </div>
      <p className="text-xs text-muted-foreground">
        This will deduct {deductionParts.join(" + ")} from your wallet.
      </p>
      <Button
        type="button"
        className="h-11 w-full gap-2"
        disabled={isPending}
        onClick={handlePay}
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {isPending ? "Paying…" : "Pay via Wallet"}
      </Button>
    </div>
  );
}
