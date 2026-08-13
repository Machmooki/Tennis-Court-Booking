"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import type { CourtBookingAnalytics } from "@/types/database";

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover p-3 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="mb-1.5 text-sm font-medium text-popover-foreground">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <p
            key={entry.dataKey}
            className="flex items-center gap-1.5"
            style={{ color: entry.color }}
          >
            <span
              className="size-2 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            {entry.dataKey === "revenue"
              ? `Revenue: ${formatCurrency(entry.value)}`
              : `Bookings: ${entry.value}`}
          </p>
        ))}
      </div>
    </div>
  );
}

function legendLabel(value: string) {
  return value === "revenue" ? "Revenue" : "Bookings";
}

export function AnalyticsChart({ data }: { data: CourtBookingAnalytics[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No confirmed bookings yet.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barGap={4}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="court_name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            yAxisId="revenue"
            orientation="left"
            tickLine={false}
            axisLine={false}
            width={60}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => formatCurrency(value)}
          />
          <YAxis
            yAxisId="bookings"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "var(--muted)" }}
          />
          <Legend
            formatter={legendLabel}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Bar
            yAxisId="revenue"
            dataKey="revenue"
            name="revenue"
            fill="var(--primary)"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
          <Bar
            yAxisId="bookings"
            dataKey="bookings_count"
            name="bookings_count"
            fill="var(--chart-2)"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
