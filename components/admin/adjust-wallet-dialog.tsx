"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adjustWalletBalance } from "@/app/admin/members/actions";
import type { CustomerRow } from "@/types/database";

type AdjustmentType = "add" | "deduct";
type WalletBucket = "all_time" | "off_peak";

const ADJUSTMENT_OPTIONS: { value: AdjustmentType; label: string }[] = [
  { value: "add", label: "Add" },
  { value: "deduct", label: "Deduct" },
];

const BUCKET_OPTIONS: { value: WalletBucket; label: string }[] = [
  { value: "all_time", label: "All-Time" },
  { value: "off_peak", label: "Off-Peak" },
];

function optionLabel<T extends string>(
  options: { value: T; label: string }[],
  value: T
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function AdjustWalletDialog({
  member,
}: {
  member: Pick<
    CustomerRow,
    "id" | "full_name" | "wallet_hours_all_time" | "wallet_hours_off_peak"
  >;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("add");
  const [bucket, setBucket] = useState<WalletBucket>("all_time");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const hoursRaw = Number(formData.get("hours_amount"));
    const reason = String(formData.get("reason") ?? "");

    if (!Number.isInteger(hoursRaw) || hoursRaw <= 0) {
      setError("Hours amount must be a positive whole number.");
      return;
    }

    const signed = adjustmentType === "add" ? hoursRaw : -hoursRaw;
    const allTimeChange = bucket === "all_time" ? signed : 0;
    const offPeakChange = bucket === "off_peak" ? signed : 0;

    startTransition(async () => {
      const result = await adjustWalletBalance(
        member.id,
        allTimeChange,
        offPeakChange,
        reason
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      toast.success(
        `${adjustmentType === "add" ? "Added" : "Deducted"} ${hoursRaw} ${
          bucket === "all_time" ? "All-Time" : "Off-Peak"
        } hour${hoursRaw === 1 ? "" : "s"} for ${member.full_name}.`
      );
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setAdjustmentType("add");
          setBucket("all_time");
          setError(null);
        } else {
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-11 gap-1.5"
            aria-label={`Adjust balance for ${member.full_name}`}
          >
            <Wallet className="size-4" />
            Adjust
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit} key={open ? "open" : "closed"}>
          <DialogHeader>
            <DialogTitle>Adjust wallet — {member.full_name}</DialogTitle>
            <DialogDescription>
              Current balance: {member.wallet_hours_all_time} All-Time ·{" "}
              {member.wallet_hours_off_peak} Off-Peak. Use this for cash
              package sales or clawbacks at the counter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adjustment_type">Adjustment type</Label>
                <Select
                  value={adjustmentType}
                  onValueChange={(value) => {
                    if (value === "add" || value === "deduct") {
                      setAdjustmentType(value);
                    }
                  }}
                >
                  <SelectTrigger
                    id="adjustment_type"
                    className="h-11 w-full min-w-0"
                  >
                    <SelectValue>
                      {optionLabel(ADJUSTMENT_OPTIONS, adjustmentType)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bucket">Bucket</Label>
                <Select
                  value={bucket}
                  onValueChange={(value) => {
                    if (value === "all_time" || value === "off_peak") {
                      setBucket(value);
                    }
                  }}
                >
                  <SelectTrigger id="bucket" className="h-11 w-full min-w-0">
                    <SelectValue>
                      {optionLabel(BUCKET_OPTIONS, bucket)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BUCKET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hours_amount">Hours amount</Label>
              <Input
                id="hours_amount"
                name="hours_amount"
                type="number"
                min="1"
                step="1"
                required
                defaultValue={1}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason / note</Label>
              <Input
                id="reason"
                name="reason"
                required
                minLength={3}
                maxLength={300}
                placeholder="e.g. Cash sale — Quiet Hours 10 package"
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending} className="h-11 gap-2">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Saving…" : "Apply adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
