"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface OutcomeDatum {
  label: string;
  count: number;
}

/** Visual comparison of current outcomes; the report's definition list is the text equivalent. */
export function BookingOutcomeChart({ rows }: { rows: OutcomeDatum[] }) {
  return (
    <ChartContainer
      aria-hidden="true"
      config={{ count: { label: "Bookings", color: "var(--chart-1)" } }}
      className="aspect-auto h-64 w-full"
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        accessibilityLayer={false}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={108}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={<ChartTooltipContent />}
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[0, 3, 3, 0]}
          barSize={18}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}

export interface MaterialWeightDatum {
  code: string;
  estimatedGrams: number;
  weighedGrams: number;
}

const kilograms = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

/** Values stay in grams; conversion happens only at the display boundary. */
export function MaterialWeightChart({ rows }: { rows: MaterialWeightDatum[] }) {
  return (
    <ChartContainer
      aria-hidden="true"
      config={{
        estimatedGrams: { label: "Estimated", color: "var(--chart-3)" },
        weighedGrams: { label: "Weighed", color: "var(--chart-1)" },
      }}
      className="aspect-auto h-64 w-full"
    >
      <BarChart
        data={rows}
        margin={{ top: 8, right: 4, bottom: 4, left: 0 }}
        accessibilityLayer={false}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="code"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          width={48}
          axisLine={false}
          tickLine={false}
          tickFormatter={(grams: number) => kilograms.format(grams / 1000)}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <span>
                  {name === "estimatedGrams" ? "Estimated" : "Weighed"}:{" "}
                  {kilograms.format(Number(value) / 1000)} kg
                </span>
              )}
            />
          }
        />
        <Bar
          dataKey="estimatedGrams"
          fill="var(--color-estimatedGrams)"
          radius={[3, 3, 0, 0]}
          maxBarSize={32}
          isAnimationActive={false}
        />
        <Bar
          dataKey="weighedGrams"
          fill="var(--color-weighedGrams)"
          radius={[3, 3, 0, 0]}
          maxBarSize={32}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
