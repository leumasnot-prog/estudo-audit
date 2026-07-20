"use client";

import nextDynamic from "next/dynamic";
import type { DailyAnalytics } from "@/lib/analytics";

const DailyVolumeChart = nextDynamic(
  () => import("./daily-volume-chart").then((mod) => mod.DailyVolumeChart),
  { ssr: false, loading: () => <div className="h-64 w-full bg-card/40 animate-pulse rounded-lg border border-border flex items-center justify-center text-xs text-muted-foreground">Carregando gráfico de volume...</div> }
);

const DailyAccuracyChart = nextDynamic(
  () => import("./daily-accuracy-chart").then((mod) => mod.DailyAccuracyChart),
  { ssr: false, loading: () => <div className="h-64 w-full bg-card/40 animate-pulse rounded-lg border border-border flex items-center justify-center text-xs text-muted-foreground">Carregando gráfico de taxa de acerto...</div> }
);

export function DashboardCharts({ data }: { data: DailyAnalytics[] }) {
  // Calculando estatísticas de resumo do período
  const totalVolume = data.reduce((acc, d) => acc + d.whatsappCorrect + d.whatsappIncorrect + d.webCorrect + d.webIncorrect, 0);
  const whatsappTotal = data.reduce((acc, d) => acc + d.whatsappCorrect + d.whatsappIncorrect, 0);
  const whatsappPct = totalVolume > 0 ? Math.round((whatsappTotal / totalVolume) * 100) : 0;
  
  const validAccuracies = data.map((d) => d.accuracy).filter((a): a is number => a !== null);
  const avgAccuracy = validAccuracies.length > 0 
    ? Math.round(validAccuracies.reduce((acc, v) => acc + v, 0) / validAccuracies.length) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Barra de destaque com resumos estatísticos rápidos */}
      <div className="grid grid-cols-3 gap-4 border-b border-border/60 pb-4">
        <div className="space-y-0.5">
          <span className="text-[11px] text-muted-foreground font-medium block">Total Respondido (7d)</span>
          <span className="text-lg font-bold text-foreground tabular-nums">{totalVolume} questões</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[11px] text-muted-foreground font-medium block">Participação do WhatsApp</span>
          <span className="text-lg font-bold text-primary tabular-nums">{whatsappPct}% <span className="text-xs font-normal text-muted-foreground">({whatsappTotal} via Whats)</span></span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[11px] text-muted-foreground font-medium block">Média de Precisão</span>
          <span className={`text-lg font-bold tabular-nums ${avgAccuracy >= 70 ? "text-emerald-500" : "text-amber-500"}`}>
            {avgAccuracy}%
          </span>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Column 1: Daily volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Volume por Canal
            </h3>
            <span className="text-[10px] text-muted-foreground">WhatsApp vs Web</span>
          </div>
          <DailyVolumeChart data={data} />
        </div>

        {/* Column 2: Accuracy evolution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Evolução da Precisão
            </h3>
            <span className="text-[10px] text-muted-foreground">Taxa % Diária</span>
          </div>
          <DailyAccuracyChart data={data} />
        </div>
      </div>
    </div>
  );
}
