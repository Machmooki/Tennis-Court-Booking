import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WalletTransactionType } from "@/types/database";

export interface MemberWalletTransactionRow {
  id: string;
  type: WalletTransactionType;
  hours_amount: number;
  note: string | null;
  created_at: string;
  package: { name: string } | null;
}

const TYPE_LABEL: Record<WalletTransactionType, string> = {
  topup: "Top-up",
  usage: "Usage",
  admin_adjustment: "Adjustment",
};

const TYPE_VARIANT: Record<
  WalletTransactionType,
  "default" | "secondary" | "outline"
> = {
  topup: "default",
  usage: "secondary",
  admin_adjustment: "outline",
};

function formatHoursAmount(amount: number): string {
  const sign = amount > 0 ? "+" : "";
  const label = Math.abs(amount) === 1 ? "hour" : "hours";
  return `${sign}${amount} ${label}`;
}

/** Prefers the linked package's name (top-ups from the storefront); falls
 * back to the free-text `note` (admin adjustments, wallet-paid bookings). */
function describeTransaction(tx: MemberWalletTransactionRow): string {
  return tx.package?.name ?? tx.note ?? "—";
}

export function WalletHistoryTable({
  transactions,
}: {
  transactions: MemberWalletTransactionRow[];
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No wallet activity yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="whitespace-nowrap">
                {formatDateTime(tx.created_at)}
              </TableCell>
              <TableCell>
                <Badge variant={TYPE_VARIANT[tx.type]}>
                  {TYPE_LABEL[tx.type]}
                </Badge>
              </TableCell>
              <TableCell
                className={cn(
                  "font-medium whitespace-nowrap",
                  tx.hours_amount > 0 ? "text-emerald-600" : "text-destructive"
                )}
              >
                {formatHoursAmount(tx.hours_amount)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {describeTransaction(tx)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
