import { CalendarDays, Clock, MapPin, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateTime, formatTime } from "@/lib/format";
import type { BookingStatus } from "@/types/database";

export interface ETicketCardProps {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  courtName: string;
  /** Pre-formatted Asia/Bangkok date, e.g. "Aug 13, 2026". */
  date: string;
  /** Pre-formatted 24-hour range, e.g. "14:00 – 15:00". */
  time: string;
  price: number;
  status: BookingStatus;
  /** Pre-formatted Asia/Bangkok date+time from `created_at`. */
  transactionTime: string;
}

/** Builds display props from booking timestamps (Asia/Bangkok formatters). */
export function buildETicketCardProps(input: {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  courtName: string;
  startIso: string;
  endIso: string;
  createdAtIso: string;
  price: number;
  status: BookingStatus;
}): ETicketCardProps {
  return {
    bookingId: input.bookingId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    courtName: input.courtName,
    date: formatDate(input.startIso),
    time: `${formatTime(input.startIso)} – ${formatTime(input.endIso)}`,
    price: input.price,
    status: input.status,
    transactionTime: formatDateTime(input.createdAtIso),
  };
}

const STATUS_VARIANT: Record<
  BookingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
  blocked: "outline",
};

/**
 * On-site E-Ticket (not the Resend email template). Purely presentational so
 * members and admins see the same ticket in a dialog, with no email round trip.
 */
export function ETicketCard({
  bookingId,
  customerName,
  customerPhone,
  courtName,
  date,
  time,
  price,
  status,
  transactionTime,
}: ETicketCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl bg-card text-card-foreground shadow-lg ring-1 ring-foreground/10">
      <header className="space-y-3 bg-primary/5 px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            E-Ticket
          </p>
          <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
        </div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <MapPin className="size-5 text-primary" />
          {courtName}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {date}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5" />
            {time}
          </span>
        </div>
        <p className="text-lg font-semibold tracking-tight">
          {formatCurrency(price)}
        </p>
      </header>

      <TicketPerforation />

      <section className="space-y-3 px-6 py-5">
        <TicketRow label="Guest" value={customerName} />
        <TicketRow label="Phone" value={customerPhone} />
        <TicketRow label="Transaction time" value={transactionTime} />
      </section>

      <TicketPerforation />

      <section className="flex flex-col items-center gap-3 px-6 py-6 text-center">
        <div className="flex size-24 items-center justify-center rounded-2xl border border-dashed bg-muted/40">
          <QrCode className="size-14 text-muted-foreground" />
        </div>
        <p className="font-mono text-[11px] break-all text-muted-foreground">
          {bookingId}
        </p>
        <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
          Please arrive 10 minutes before your slot. Show this ticket at the
          front desk.
        </p>
      </section>
    </article>
  );
}

function TicketPerforation() {
  return (
    <div className="relative" aria-hidden="true">
      <div className="border-t border-dashed border-border" />
      <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-muted/30 ring-1 ring-foreground/5" />
      <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-muted/30 ring-1 ring-foreground/5" />
    </div>
  );
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right font-medium">{value}</span>
    </div>
  );
}
