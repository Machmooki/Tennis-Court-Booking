import { createClient } from "@/lib/supabase/server";
import {
  TransactionsTable,
  type AdminTransactionRow,
} from "@/components/admin/transactions/transactions-table";
import { buildETicketCardProps } from "@/components/booking/e-ticket-card";
import type { BookingStatus, TransactionStatus, TransactionType } from "@/types/database";

const RECENT_TRANSACTIONS_LIMIT = 200;

interface BookingForTicket {
  id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  total_price: number;
  status: BookingStatus;
  payment_intent_id: string | null;
  court: { name: string } | null;
  customer: { full_name: string; phone: string } | null;
}

export default async function AdminTransactionsPage() {
  const supabase = await createClient();
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(
      "id, customer_id, amount, type, status, provider_reference, created_at, customer:customers(full_name, phone)"
    )
    .order("created_at", { ascending: false })
    .limit(RECENT_TRANSACTIONS_LIMIT);

  if (error) {
    throw new Error(`Failed to load transactions: ${error.message}`);
  }

  const rows = transactions ?? [];
  const customerIds = [...new Set(rows.map((tx) => tx.customer_id))];

  let bookings: BookingForTicket[] = [];
  if (customerIds.length > 0) {
    const { data, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        "id, customer_id, start_time, end_time, created_at, updated_at, total_price, status, payment_intent_id, court:courts(name), customer:customers(full_name, phone)"
      )
      .eq("status", "confirmed")
      .in("customer_id", customerIds);

    if (bookingsError) {
      throw new Error(`Failed to load booking tickets: ${bookingsError.message}`);
    }
    bookings = (data ?? []) as BookingForTicket[];
  }

  const tableRows: AdminTransactionRow[] = rows.map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    status: tx.status,
    provider_reference: tx.provider_reference,
    created_at: tx.created_at,
    customer: tx.customer,
    tickets: bookingsForTransaction(tx, bookings).map((booking) =>
      buildETicketCardProps({
        bookingId: booking.id,
        customerName: booking.customer?.full_name ?? tx.customer?.full_name ?? "Guest",
        customerPhone: booking.customer?.phone ?? tx.customer?.phone ?? "—",
        courtName: booking.court?.name ?? "Court",
        startIso: booking.start_time,
        endIso: booking.end_time,
        createdAtIso: booking.created_at,
        price: booking.total_price,
        status: booking.status,
      })
    ),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Transactions
        </h1>
        <p className="text-sm text-muted-foreground">
          Real cash movement behind the Cash Flow figure on the dashboard -
          showing the {RECENT_TRANSACTIONS_LIMIT} most recent records.
        </p>
      </div>

      <TransactionsTable transactions={tableRows} />
    </div>
  );
}

function bookingsForTransaction(
  tx: {
    customer_id: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    provider_reference: string | null;
    created_at: string;
  },
  bookings: BookingForTicket[]
): BookingForTicket[] {
  if (tx.type !== "payment" || tx.status !== "completed") return [];

  const owned = bookings.filter(
    (booking) => booking.customer_id === tx.customer_id && booking.payment_intent_id
  );
  const ref = tx.provider_reference?.trim() ?? "";
  if (ref.startsWith("pi_")) {
    const exact = owned.filter((booking) => booking.payment_intent_id === ref);
    if (exact.length > 0) return exact;
  }

  const groups = new Map<string, BookingForTicket[]>();
  for (const booking of owned) {
    const key = booking.payment_intent_id as string;
    const group = groups.get(key);
    if (group) group.push(booking);
    else groups.set(key, [booking]);
  }

  const amount = Number(tx.amount);
  const txTime = new Date(tx.created_at).getTime();
  let best: BookingForTicket[] = [];
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const group of groups.values()) {
    const sum = group.reduce((total, booking) => total + Number(booking.total_price), 0);
    if (Math.abs(sum - amount) > 0.05) continue;

    const groupTime = Math.min(
      ...group.map((booking) => new Date(booking.updated_at).getTime())
    );
    const delta = Math.abs(groupTime - txTime);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = group;
    }
  }

  return best;
}
