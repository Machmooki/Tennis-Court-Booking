"use client";

import { useState } from "react";
import Link from "next/link";
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
import { buildETicketCardProps, type ETicketCardProps } from "@/components/booking/e-ticket-card";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import type { BookingStatus } from "@/types/database";

export interface MemberBookingRow {
  id: string;
  start_time: string;
  end_time: string;
  created_at: string;
  total_price: number;
  status: BookingStatus;
  court: { id: string; name: string } | null;
}

const STATUS_VARIANT: Record<
  BookingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
  // A member's own bookings can never actually be 'blocked' (that status is
  // only ever set on the system "Court Blocked" customer, see Phase 6.2) -
  // included only so this Record stays exhaustively typed.
  blocked: "outline",
};

function toTicket(
  booking: MemberBookingRow,
  customerName: string,
  customerPhone: string
): ETicketCardProps {
  return buildETicketCardProps({
    bookingId: booking.id,
    customerName,
    customerPhone,
    courtName: booking.court?.name ?? "Court",
    startIso: booking.start_time,
    endIso: booking.end_time,
    createdAtIso: booking.created_at,
    price: booking.total_price,
    status: booking.status,
  });
}

export function BookingHistoryTable({
  bookings,
  customerName,
  customerPhone,
}: {
  bookings: MemberBookingRow[];
  customerName: string;
  customerPhone: string;
}) {
  const [ticket, setTicket] = useState<ETicketCardProps | null>(null);

  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No bookings yet.{" "}
        <Link
          href="/booking"
          className="font-medium underline-offset-4 hover:underline"
        >
          Book a court
        </Link>{" "}
        to get started.
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
              <TableHead>Time</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Booked On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ticket</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDate(booking.start_time)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatTime(booking.start_time)} –{" "}
                  {formatTime(booking.end_time)}
                </TableCell>
                <TableCell>{booking.court?.name ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(booking.created_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[booking.status]}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {booking.status === "confirmed" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-1.5 rounded-full"
                      onClick={() =>
                        setTicket(
                          toTicket(booking, customerName, customerPhone)
                        )
                      }
                    >
                      <Ticket className="size-4" />
                      <span className="hidden sm:inline">View Ticket</span>
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
        ticket={ticket}
        open={ticket !== null}
        onOpenChange={(open) => {
          if (!open) setTicket(null);
        }}
      />
    </>
  );
}
