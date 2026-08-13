"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Ban, CalendarPlus, Loader2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { blockCourtSlot, createManualBooking } from "@/app/admin/bookings/actions";

export interface CreateSlotTarget {
  courtId: string;
  courtName: string;
  startIso: string;
  endIso: string;
  timeLabel: string;
  defaultPrice: number;
}

type CreateTab = "booking" | "block";

export function CreateSlotDialog({
  target,
  onOpenChange,
  onSuccess,
}: {
  target: CreateSlotTarget | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<CreateTab>("booking");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("full_name") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const price = Number(formData.get("price"));

    startTransition(async () => {
      const result = await createManualBooking(
        target.courtId,
        target.startIso,
        target.endIso,
        fullName,
        phone,
        price
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      toast.success(
        `Booked ${target.courtName} at ${target.timeLabel} for ${fullName}.`
      );
      onSuccess();
    });
  }

  function handleBlockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;

    const formData = new FormData(event.currentTarget);
    const reason = String(formData.get("reason") ?? "");

    startTransition(async () => {
      const result = await blockCourtSlot(
        target.courtId,
        target.startIso,
        target.endIso,
        reason
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      toast.success(`Blocked ${target.courtName} at ${target.timeLabel}.`);
      onSuccess();
    });
  }

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) {
          setTab("booking");
          setError(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>
                {target.courtName} — {target.timeLabel}
              </DialogTitle>
              <DialogDescription>
                This slot is empty. Create a manual booking or take the court
                offline.
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={tab}
              onValueChange={(value) => {
                if (value === "booking" || value === "block") {
                  setTab(value);
                  setError(null);
                }
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="booking" className="gap-1.5">
                  <CalendarPlus className="size-4" />
                  Manual booking
                </TabsTrigger>
                <TabsTrigger value="block" className="gap-1.5">
                  <Ban className="size-4" />
                  Block court
                </TabsTrigger>
              </TabsList>

              <TabsContent value="booking" className="pt-3">
                <form
                  onSubmit={handleBookingSubmit}
                  key={`booking-${target.courtId}-${target.startIso}`}
                >
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name">Full name</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder="e.g. Somchai Prasert"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        required
                        inputMode="numeric"
                        placeholder="e.g. 0812345678"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="price">Price (THB)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="1"
                        required
                        defaultValue={target.defaultPrice}
                        className="h-11"
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-destructive" role="alert">
                        {error}
                      </p>
                    )}
                  </div>

                  <DialogFooter className="mt-4">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="h-11 gap-2"
                    >
                      {isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      {isPending ? "Booking…" : "Confirm booking"}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              <TabsContent value="block" className="pt-3">
                <form
                  onSubmit={handleBlockSubmit}
                  key={`block-${target.courtId}-${target.startIso}`}
                >
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reason">Reason</Label>
                      <Input
                        id="reason"
                        name="reason"
                        required
                        minLength={3}
                        maxLength={300}
                        placeholder="e.g. Court maintenance"
                        className="h-11"
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-destructive" role="alert">
                        {error}
                      </p>
                    )}
                  </div>

                  <DialogFooter className="mt-4">
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={isPending}
                      className="h-11 gap-2"
                    >
                      {isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      {isPending ? "Blocking…" : "Block slot"}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
