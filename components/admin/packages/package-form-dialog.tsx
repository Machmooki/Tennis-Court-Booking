"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPackage, updatePackage } from "@/app/admin/packages/actions";
import type { PackageRow, PackageUsableAt } from "@/types/database";

type PackageFormDialogProps =
  | { mode: "create"; package?: undefined }
  | { mode: "edit"; package: PackageRow };

const USABLE_AT_OPTIONS: { value: PackageUsableAt; label: string }[] = [
  { value: "all_times", label: "All Times (Peak & Off-Peak)" },
  { value: "off_peak", label: "Off-Peak Only" },
];

function usableAtLabel(value: PackageUsableAt): string {
  return (
    USABLE_AT_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export function PackageFormDialog(props: PackageFormDialogProps) {
  const { mode } = props;
  const pkg = props.mode === "edit" ? props.package : undefined;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usableAt, setUsableAt] = useState<PackageUsableAt>(
    pkg?.usable_at ?? "all_times"
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("usable_at", usableAt);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPackage({}, formData)
          : await updatePackage(pkg!.id, {}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      toast.success(
        mode === "create" ? "Package created." : "Package updated."
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
          setUsableAt(pkg?.usable_at ?? "all_times");
          setError(null);
        } else {
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button className="h-11 gap-2">
              <Plus className="size-4" />
              Add package
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              aria-label={`Edit ${pkg?.name}`}
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
              {mode === "create" ? "Add package" : `Edit ${pkg?.name}`}
            </DialogTitle>
            <DialogDescription>
              Configure the hour-credit package, price in THB, and when those
              hours can be used.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Quiet Hours 10"
                defaultValue={pkg?.name}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price_thb">Price (THB)</Label>
                <Input
                  id="price_thb"
                  name="price_thb"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={pkg?.price_thb}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="credit_hours">Credit hours</Label>
                <Input
                  id="credit_hours"
                  name="credit_hours"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue={pkg?.credit_hours}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="usable_at">Usable times</Label>
              <Select
                value={usableAt}
                onValueChange={(value) => {
                  if (value === "all_times" || value === "off_peak") {
                    setUsableAt(value);
                  }
                }}
              >
                <SelectTrigger
                  id="usable_at"
                  className="h-11 w-full min-w-0"
                >
                  <SelectValue>{usableAtLabel(usableAt)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {USABLE_AT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (visible for purchase)
              </Label>
              <Switch
                id="is_active"
                name="is_active"
                defaultChecked={pkg?.is_active ?? true}
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
              {isPending
                ? "Saving…"
                : mode === "create"
                  ? "Add package"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
