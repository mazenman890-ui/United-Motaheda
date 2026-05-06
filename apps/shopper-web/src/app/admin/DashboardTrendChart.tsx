/**
 * DashboardTrendChart.tsx
 * Responsive ComposedChart (bar + line) for the dashboard overview.
 * Uses ResponsiveContainer so it scales correctly on all screen sizes.
 */

import { memo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DataPoint = {
  day: string;
  label: string;
  orders: number;
  sales: number;
};

type DashboardTrendChartProps = {
  data: DataPoint[];
  lang: "ar" | "en";
  formatCompactNumber: (value: number, lang: "ar" | "en") => string;
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  lang,
  formatCompactNumber,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  lang: "ar" | "en";
  formatCompactNumber: (n: number, l: "ar" | "en") => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[10rem] rounded-[1.2rem] border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-sm">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs font-semibold text-slate-600">{entry.name}</span>
          </div>
          <span className="text-xs font-black text-slate-900">
            {entry.name === (lang === "ar" ? "الإيراد" : "Revenue")
              ? formatCompactNumber(entry.value, lang)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Custom Legend ────────────────────────────────────────────────────────────

function ChartLegend({
  payload,
}: {
  payload?: Array<{ value: string; color: string }>;
}) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-bold text-slate-500">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

function DashboardTrendChartComponent({
  data,
  lang,
  formatCompactNumber,
}: DashboardTrendChartProps) {
  const ordersLabel = lang === "ar" ? "الطلبات" : "Orders";
  const revenueLabel = lang === "ar" ? "الإيراد" : "Revenue";

  return (
    <div className="h-[22rem] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 8, left: -10, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />

          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval={0}
            tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }}
          />

          {/* Left Y axis – orders (integer count) */}
          <YAxis
            yAxisId="orders"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={28}
            tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }}
          />

          {/* Right Y axis – revenue */}
          <YAxis
            yAxisId="sales"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }}
            tickFormatter={(v) => formatCompactNumber(Number(v), lang)}
          />

          <Tooltip
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload as Array<{ name: string; value: number; color: string }>}
                label={label as string}
                lang={lang}
                formatCompactNumber={formatCompactNumber}
              />
            )}
          />

          <Legend
            content={({ payload }) =>
              ChartLegend({
                payload: payload as Array<{ value: string; color: string }>,
              })
            }
          />

          <Bar
            yAxisId="orders"
            dataKey="orders"
            name={ordersLabel}
            fill="#0d9488"
            radius={[10, 10, 4, 4]}
            maxBarSize={44}
            fillOpacity={0.88}
          />

          <Line
            yAxisId="sales"
            type="monotone"
            dataKey="sales"
            name={revenueLabel}
            stroke="#0f172a"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#0f172a", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#0d9488", strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(DashboardTrendChartComponent);