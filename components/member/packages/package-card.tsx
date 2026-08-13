"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PackageRow, PackageUsableAt } from "@/types/database";

export type PackageCardData = Pick<
  PackageRow,
  "id" | "name" | "price_thb" | "credit_hours" | "usable_at"
>;

/**
 * Master-Detail "master" tile - purely presentational + selection. Clicking
 * anywhere on the card (or its "Buy Now" button) selects it; the actual
 * checkout UI lives in the sibling `<PackagePaymentSheet>`.
 */
export function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: PackageCardData;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "cursor-pointer rounded-3xl shadow-sm transition-all outline-none hover:-translate-y-1 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "translate-y-0! shadow-lg ring-2 ring-primary"
      )}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{pkg.name}</CardTitle>
          <UsableAtBadge usableAt={pkg.usable_at} />
        </div>
        <p className="text-3xl font-semibold tracking-tight">
          {formatCurrency(pkg.price_thb)}
        </p>
      </CardHeader>
      <CardContent>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="size-3.5" />
          You get {pkg.credit_hours}{" "}
          {pkg.credit_hours === 1 ? "hour" : "hours"}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={(event) => {
            // Card itself is already clickable - stop the bubble so this
            // doesn't fire onSelect twice.
            event.stopPropagation();
            onSelect();
          }}
          className="h-11 w-full gap-2 rounded-full"
        >
          {selected ? "Selected" : "Buy Now"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function UsableAtBadge({ usableAt }: { usableAt: PackageUsableAt }) {
  if (usableAt === "off_peak") {
    return <Badge variant="secondary">Off-Peak Only</Badge>;
  }
  return <Badge variant="default">All Times</Badge>;
}
