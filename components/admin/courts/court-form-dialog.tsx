"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCourt, updateCourt } from "@/app/admin/courts/actions";
import type { CourtRow } from "@/types/database";

type CourtFormDialogProps =
  | { mode: "create"; court?: undefined }
  | { mode: "edit"; court: CourtRow };

export function CourtFormDialog(props: CourtFormDialogProps) {
  const { mode } = props;
  const court = props.mode === "edit" ? props.court : undefined;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCourt({}, formData)
          : await updateCourt(court!.id, {}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      toast.success(mode === "create" ? "Court created." : "Court updated.");
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button className="h-11 gap-2">
              <Plus className="size-4" />
              Add court
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              aria-label={`Edit ${court?.name}`}
            >
              <Pencil className="size-4" />
            </Button>
          )
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit} key={open ? "open" : "closed"}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Add court" : `Edit ${court?.name}`}
            </DialogTitle>
            <DialogDescription>
              Set the court name and hourly pricing for peak and off-peak
              hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={court?.name}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="peak_price">Peak price</Label>
                <Input
                  id="peak_price"
                  name="peak_price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={court?.peak_price}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="off_peak_price">Off-peak price</Label>
                <Input
                  id="off_peak_price"
                  name="off_peak_price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={court?.off_peak_price}
                  className="h-11"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (visible for booking)
              </Label>
              <Switch
                id="is_active"
                name="is_active"
                defaultChecked={court?.is_active ?? true}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending} className="h-11">
              {isPending
                ? "Saving…"
                : mode === "create"
                  ? "Add court"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
