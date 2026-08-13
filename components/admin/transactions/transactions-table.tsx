"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ETicketDialog } from "@/components/booking/e-ticket-dialog";
import type { ETicketCardProps } from "@/components/booking/e-ticket-card";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { TransactionStatus, TransactionType } from "@/types/database";

export interface AdminTransactionRow {
  id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  provider_reference: string | null;
  created_at: string;
  customer: { full_name: string; phone: string } | null;
  tickets: ETicketCardProps[];
}

const TYPE_LABEL: Record<TransactionType, string> = {
  payment: "Payment",
  refund: "Refund",
  credit_topup: "Credit Top-up",
  credit_deduction: "Credit Deduction",
};

const STATUS_VARIANT: Record<
  TransactionStatus,
  "default" | "secondary" | "destructive"
> = {
  completed: "default",
  pending: "secondary",
  failed: "destructive",
};

export function TransactionsTable({
  transactions,
}: {
  transactions: AdminTransactionRow[];
}) {
  const [tickets, setTickets] = useState<ETicketCardProps[] | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No transactions recorded yet.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Provider Reference</TableHead>
              <TableHead className="text-right">Ticket</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(tx.created_at)}
                </TableCell>
                <TableCell>{tx.customer?.full_name ?? "—"}</TableCell>
                <TableCell>{TYPE_LABEL[tx.type]}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {formatCurrency(tx.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[tx.status]}>{tx.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {tx.provider_reference ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {tx.tickets.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-1.5 rounded-full"
                      onClick={() => setTickets(tx.tickets)}
                    >
                      <Ticket className="size-4" />
                      <span className="hidden sm:inline">
                        {tx.tickets.length > 1 ? "View Tickets" : "View Ticket"}
                      </span>
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ETicketDialog
        tickets={tickets ?? []}
        open={tickets !== null}
        onOpenChange={(open) => {
          if (!open) setTickets(null);
        }}
      />
    </>
  );
}
