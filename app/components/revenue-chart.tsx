import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import { Button } from "~/components/ui/button";
import { formatPrice } from "~/lib/utils";
import type { RevenueDataPoint, RevenueRange } from "~/services/analyticsService";

const RANGE_LABELS: Record<RevenueRange, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
};

// Fewer axis ticks for longer ranges so labels don't overlap.
const TICK_INTERVAL: Record<RevenueRange, number> = {
  "7d": 0,
  "30d": 4,
  "90d": 14,
};

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

function formatTickDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function RevenueChart({
  seriesByRange,
  defaultRange = "30d",
  showRangeToggle = true,
  compact = false,
}: {
  seriesByRange: Record<RevenueRange, RevenueDataPoint[]>;
  defaultRange?: RevenueRange;
  showRangeToggle?: boolean;
  compact?: boolean;
}) {
  const [range, setRange] = useState<RevenueRange>(defaultRange);
  const data = seriesByRange[range];

  return (
    <div>
      {showRangeToggle && (
        <div className="mb-3 flex items-center justify-end gap-1">
          {(Object.keys(RANGE_LABELS) as RevenueRange[]).map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={r === range ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setRange(r)}
            >
              {RANGE_LABELS[r]}
            </Button>
          ))}
        </div>
      )}
      <ChartContainer
        config={chartConfig}
        className={compact ? "aspect-auto h-32 w-full" : "aspect-auto h-64 w-full"}
      >
        <BarChart data={data} margin={{ left: 0, right: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={TICK_INTERVAL[range]}
            hide={compact}
            tickFormatter={formatTickDate}
          />
          {!compact && (
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatTickDate(String(value))}
                  formatter={(value) => (
                    <div className="flex flex-1 items-center justify-between leading-none">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {formatPrice(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
          )}
          <Bar dataKey="revenueCents" fill="var(--color-revenue)" radius={2} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
