"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { DailyAnalytics } from "@/lib/analytics";

interface Row {
  dateLabel: string;
  accuracy: number | null;
}

function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as Row;

  return (
    <div className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-md backdrop-blur-md text-xs font-sans">
      <div className="border-b border-border/50 pb-1.5 mb-2 font-medium text-foreground">
        Data: {data.dateLabel}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Precisão no dia:</span>
        <span className={`font-bold tabular-nums ${
          data.accuracy === null 
            ? "text-muted-foreground" 
            : data.accuracy >= 70 
              ? "text-emerald-500" 
              : "text-amber-500"
        }`}>
          {data.accuracy === null ? "Sem respostas" : `${data.accuracy}%`}
        </span>
      </div>
    </div>
  );
}

export function DailyAccuracyChart({ data }: { data: DailyAnalytics[] }) {
  const rows: Row[] = data.map((d) => ({
    dateLabel: formatDateLabel(d.date),
    accuracy: d.accuracy,
  }));

  return (
    <div className="h-64 w-full">
      {/* Indicador de meta */}
      <div className="mb-3 flex items-center justify-end gap-2 font-sans text-xs text-muted-foreground">
        <span className="inline-block w-4 h-0.5 bg-blue-500/80 rounded" />
        <span>Evolução diária</span>
        <span className="inline-block w-4 h-0 border-t border-dashed border-emerald-500/60 ml-2" />
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Meta (70%)</span>
      </div>

      <ResponsiveContainer width="100%" height="86%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            className="stroke-border/40"
          />
          <XAxis
            dataKey="dateLabel"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-muted-foreground font-sans"
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-muted-foreground font-sans"
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Linha de referência da Meta 70% */}
          <ReferenceLine
            y={70}
            stroke="#10B981"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />

          <Area
            type="monotone"
            dataKey="accuracy"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#accuracyGradient)"
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
