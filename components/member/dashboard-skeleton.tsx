import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SKELETON_ROWS = 4;

/**
 * Fallback for `<DashboardData>` - mimics the greeting + CTA, wallet cards,
 * and booking history table. Soft, muted pastel tones keep it feeling calm.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-lg bg-muted/70" />
          <Skeleton className="h-4 w-64 rounded-full bg-muted/60" />
        </div>
        <Skeleton className="h-11 w-40 shrink-0 rounded-full bg-muted/70" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="rounded-2xl">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <Skeleton className="h-4 w-24 rounded-full bg-muted/70" />
              <Skeleton className="h-4 w-4 rounded-full bg-muted/70" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-16 rounded-lg bg-muted/70" />
              <Skeleton className="h-3 w-40 rounded-full bg-muted/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-8 w-56 rounded-lg bg-muted/70" />
        <div className="rounded-2xl border bg-card">
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
              {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20 rounded-full bg-muted/60" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24 rounded-full bg-muted/60" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16 rounded-full bg-muted/60" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28 rounded-full bg-muted/60" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full bg-muted/60" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-11 w-11 rounded-full bg-muted/60 sm:w-28" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
