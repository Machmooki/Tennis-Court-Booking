import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTime } from "@/lib/format";
import type { BookingStatus } from "@/types/database";

export interface MemberBookingRow {
  id: string;
  start_time: string;
  end_time: string;
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

export function BookingHistoryTable({
  bookings,
}: {
  bookings: MemberBookingRow[];
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No bookings yet.{" "}
        <Link href="/booking" className="font-medium underline-offset-4 hover:underline">
          Book a court
        </Link>{" "}
        to get started.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Court</TableHead>
            <TableHead>Status</TableHead>
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
              <TableCell>
                <Badge variant={STATUS_VARIANT[booking.status]}>
                  {booking.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
