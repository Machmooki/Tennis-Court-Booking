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
import { deletePackage, setPackageActive } from "@/app/admin/packages/actions";
import { PackageFormDialog } from "@/components/admin/packages/package-form-dialog";
import { formatCurrency } from "@/lib/format";
import type { PackageRow, PackageUsableAt } from "@/types/database";

function usableAtBadge(usableAt: PackageUsableAt) {
  if (usableAt === "off_peak") {
    return <Badge variant="secondary">Off-Peak Only</Badge>;
  }
  return <Badge variant="default">All Times</Badge>;
}

export function PackagesTable({ packages }: { packages: PackageRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  function handleToggleActive(pkg: PackageRow, isActive: boolean) {
    startTransition(async () => {
      try {
        await setPackageActive(pkg.id, isActive);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update package."
        );
      }
    });
  }

  function handleDelete(packageId: string) {
    startTransition(async () => {
      try {
        await deletePackage(packageId);
        toast.success("Package deleted.");
        setDeleteTargetId(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete package."
        );
      }
    });
  }

  if (packages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No packages yet. Add your first hour-credit package to get started.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Credit hours</TableHead>
            <TableHead>Usable</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.map((pkg) => (
            <TableRow key={pkg.id}>
              <TableCell className="font-medium">{pkg.name}</TableCell>
              <TableCell>{formatCurrency(pkg.price_thb)}</TableCell>
              <TableCell>
                {pkg.credit_hours} {pkg.credit_hours === 1 ? "hour" : "hours"}
              </TableCell>
              <TableCell>{usableAtBadge(pkg.usable_at)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={pkg.is_active}
                    disabled={isPending}
                    onCheckedChange={(checked) =>
                      handleToggleActive(pkg, checked)
                    }
                    aria-label={`Toggle ${pkg.name} active state`}
                  />
                  <Badge variant={pkg.is_active ? "default" : "secondary"}>
                    {pkg.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <PackageFormDialog mode="edit" package={pkg} />
                  <AlertDialog
                    open={deleteTargetId === pkg.id}
                    onOpenChange={(open) =>
                      setDeleteTargetId(open ? pkg.id : null)
                    }
                  >
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Delete ${pkg.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete {pkg.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This can&apos;t be undone. Past wallet top-ups that
                          used this package will keep their history (package
                          link is cleared).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          disabled={isPending}
                          className="gap-2"
                          onClick={() => handleDelete(pkg.id)}
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
