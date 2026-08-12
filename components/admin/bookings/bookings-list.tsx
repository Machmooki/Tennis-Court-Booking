import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatTime } from "@/lib/format";
import type { BookingStatus } from "@/types/database";

export interface BookingListItem {
  id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  total_price: number;
  court: { id: string; name: string } | null;
  customer: { id: string; full_name: string; phone: string } | null;
}

const STATUS_VARIANT: Record<
  BookingStatus,
  "default" | "secondary" | "destructive"
> = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
};

export function BookingsList({ bookings }: { bookings: BookingListItem[] }) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No bookings for this day.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Court</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="whitespace-nowrap">
                {formatTime(booking.start_time)} –{" "}
                {formatTime(booking.end_time)}
              </TableCell>
              <TableCell>{booking.court?.name ?? "—"}</TableCell>
              <TableCell>{booking.customer?.full_name ?? "—"}</TableCell>
              <TableCell>{booking.customer?.phone ?? "—"}</TableCell>
              <TableCell>{formatCurrency(booking.total_price)}</TableCell>
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
