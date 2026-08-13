import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdjustWalletDialog } from "@/components/admin/adjust-wallet-dialog";
import type { CustomerRow } from "@/types/database";

export type MemberListItem = Pick<
  CustomerRow,
  | "id"
  | "full_name"
  | "phone"
  | "wallet_hours_all_time"
  | "wallet_hours_off_peak"
>;

function hoursLabel(hours: number): string {
  return `${hours} ${hours === 1 ? "hr" : "hrs"}`;
}

export function MembersTable({ members }: { members: MemberListItem[] }) {
  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No registered members yet. Guests who create an account will appear
        here.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>All-Time</TableHead>
            <TableHead>Off-Peak</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.full_name}</TableCell>
              <TableCell>{member.phone}</TableCell>
              <TableCell>
                {hoursLabel(member.wallet_hours_all_time)}
              </TableCell>
              <TableCell>
                {hoursLabel(member.wallet_hours_off_peak)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <AdjustWalletDialog member={member} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
