"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DailyAnalytics } from "@/lib/analytics";

interface Row extends DailyAnalytics {
  dateLabel: string;
  whatsapp: number;
  web: number;
}

function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

const SERIES = [
  { key: "whatsapp", label: "WhatsApp", color: "hsl(var(--chart-1))" },
  { key: "web", label: "Painel Web", color: "hsl(var(--chart-2))" },
] as const;

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as Row;

  return (
    <div className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-md backdrop-blur-md text-xs font-sans">
      <div className="border-b border-border/50 pb-1.5 mb-2 font-medium text-foreground">
        Data: {data.dateLabel}
      </div>
      <div className="space-y-1.5">
        {SERIES.map(({ key, label, color }) => (
          <div key={key} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {data[key]} questões
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-6 border-t border-border/50 pt-1.5 mt-1">
          <span className="font-medium text-muted-foreground text-[11px]">Total no dia</span>
          <span className="font-bold tabular-nums text-primary text-xs">
            {data.whatsapp + data.web} questões
          </span>
        </div>
      </div>
    </div>
  );
}

export function DailyVolumeChart({ data }: { data: DailyAnalytics[] }) {
  const rows: Row[] = data.map((d) => ({
    ...d,
    dateLabel: formatDateLabel(d.date),
    whatsapp: d.whatsappCorrect + d.whatsappIncorrect,
    web: d.webCorrect + d.webIncorrect,
  }));

  return (
    <div className="h-64 w-full">
      {/* Legenda limpa */}
      <div className="mb-3 flex items-center justify-end gap-5 font-sans text-xs text-muted-foreground">
        {SERIES.map(({ key, label, color }) => (
          <span key={key} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span>{label}</span>
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height="86%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-muted-foreground font-sans"
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Barras empilhadas com cantos arredondados no topo */}
          <Bar
            dataKey="whatsapp"
            stackId="a"
            fill="hsl(var(--chart-1))"
            radius={[0, 0, 0, 0]}
            barSize={24}
          />
          <Bar
            dataKey="web"
            stackId="a"
            fill="hsl(var(--chart-2))"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
