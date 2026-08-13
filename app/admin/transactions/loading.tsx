import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SKELETON_ROWS = 6;

export default function AdminTransactionsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-lg bg-muted/70" />
        <Skeleton className="h-4 w-96 max-w-full rounded-full bg-muted/60" />
      </div>

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
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-28 rounded-full bg-muted/60" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24 rounded-full bg-muted/60" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20 rounded-full bg-muted/60" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16 rounded-full bg-muted/60" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full bg-muted/60" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32 rounded-full bg-muted/60" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-9 w-24 rounded-full bg-muted/60" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
