import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import type { AnalysisResult } from "@/lib/stock-analysis";

type Props = {
  data: AnalysisResult["rows"];
  currency: string;
  splitDate?: string;
};

const fmt = (n: number | null | undefined, currency: string) =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

export function StockChart({ data, currency, splitDate }: Props) {
  const sampled = useMemo(() => {
    // Recharts is fine with ~1500 points; downsample if longer.
    if (data.length <= 1500) return data;
    const step = Math.ceil(data.length / 1500);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={sampled} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="closeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.18 155)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="oklch(0.78 0.18 155)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v.toFixed(0)}`}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: "oklch(0.18 0.025 250 / 0.95)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-foreground)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            formatter={(value: unknown, name) => [
              fmt(typeof value === "number" ? value : null, currency),
              String(name),
            ]}
            labelStyle={{ color: "var(--color-muted-foreground)", marginBottom: 4 }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: 12, fontFamily: "var(--font-mono)" }}
            iconType="line"
          />
          {splitDate && (
            <ReferenceLine
              x={splitDate}
              stroke="oklch(1 0 0 / 0.25)"
              strokeDasharray="4 4"
              label={{
                value: "train | test",
                fill: "var(--color-muted-foreground)",
                fontSize: 10,
                position: "top",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="close"
            name="Close"
            stroke="var(--color-bull)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="ma50"
            name="MA 50"
            stroke="var(--color-ma50)"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="ma100"
            name="MA 100"
            stroke="var(--color-ma100)"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="fit"
            name="Linear fit"
            stroke="var(--color-foreground)"
            strokeWidth={1}
            strokeDasharray="3 3"
            strokeOpacity={0.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="var(--color-forecast)"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
