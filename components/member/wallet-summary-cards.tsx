import { Moon, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function hoursLabel(hours: number): string {
  return hours === 1 ? "hour" : "hours";
}

export function WalletSummaryCards({
  allTimeHours,
  offPeakHours,
}: {
  allTimeHours: number;
  offPeakHours: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            All-Time Credit
          </CardTitle>
          <Wallet className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">
            {allTimeHours}{" "}
            <span className="text-base font-normal text-muted-foreground">
              {hoursLabel(allTimeHours)}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Usable any time — peak &amp; off-peak.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Off-Peak Credit
          </CardTitle>
          <Moon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">
            {offPeakHours}{" "}
            <span className="text-base font-normal text-muted-foreground">
              {hoursLabel(offPeakHours)}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Usable only during quiet / off-peak hours.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
