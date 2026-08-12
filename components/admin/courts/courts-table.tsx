"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteCourt, setCourtActive } from "@/app/admin/courts/actions";
import { CourtFormDialog } from "@/components/admin/courts/court-form-dialog";
import { formatCurrency } from "@/lib/format";
import type { CourtRow } from "@/types/database";

export function CourtsTable({ courts }: { courts: CourtRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  function handleToggleActive(court: CourtRow, isActive: boolean) {
    startTransition(async () => {
      try {
        await setCourtActive(court.id, isActive);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update court."
        );
      }
    });
  }

  function handleDelete(courtId: string) {
    startTransition(async () => {
      try {
        await deleteCourt(courtId);
        toast.success("Court deleted.");
        setDeleteTargetId(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete court."
        );
      }
    });
  }

  if (courts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No courts yet. Add your first court to get started.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Peak price</TableHead>
            <TableHead>Off-peak price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courts.map((court) => (
            <TableRow key={court.id}>
              <TableCell className="font-medium">{court.name}</TableCell>
              <TableCell>{formatCurrency(court.peak_price)}</TableCell>
              <TableCell>{formatCurrency(court.off_peak_price)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={court.is_active}
                    disabled={isPending}
                    onCheckedChange={(checked) =>
                      handleToggleActive(court, checked)
                    }
                    aria-label={`Toggle ${court.name} active state`}
                  />
                  <Badge variant={court.is_active ? "default" : "secondary"}>
                    {court.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <CourtFormDialog mode="edit" court={court} />
                  <AlertDialog
                    open={deleteTargetId === court.id}
                    onOpenChange={(open) =>
                      setDeleteTargetId(open ? court.id : null)
                    }
                  >
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Delete ${court.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete {court.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This can&apos;t be undone. If this court has any
                          existing bookings, deletion will fail — deactivate
                          it instead.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          disabled={isPending}
                          className="gap-2"
                          onClick={() => handleDelete(court.id)}
                        >
                          {isPending && (
                            <Loader2 className="size-4 animate-spin" />
                          )}
                          {isPending ? "Deleting…" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
