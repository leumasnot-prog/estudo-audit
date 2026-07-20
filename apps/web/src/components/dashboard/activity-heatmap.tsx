import { cn } from "@/lib/utils";
import type { ActivityDay } from "@/lib/analytics";

/**
 * Caixinha de recorrência estilo Claude Code: box mono com cantos
 * arredondados + contribution graph das últimas semanas. Escala
 * SEQUENCIAL da paleta (validada: luminosidade monotônica) via CSS vars
 * --heat-0..4 — no dark, mais atividade = mais claro; no light, o oposto.
 */

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function formatLabel(date: string, count: number): string {
  const [, m, d] = date.split("-");
  const month = MONTHS[Number(m) - 1] ?? m;
  return `${Number(d)} ${month}: ${count} ${count === 1 ? "questão" : "questões"}`;
}

export function ActivityHeatmap({
  days,
  streakDays,
}: {
  days: ActivityDay[];
  streakDays: number;
}) {
  // Colunas = semanas (domingo → sábado); a 1ª célula da grade é domingo
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const total30d = days.slice(-30).reduce((acc, d) => acc + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <div className="anim-rise rounded-md border border-primary/40 bg-card/30 font-mono text-xs backdrop-blur-sm">
      {/* Header no estilo do box do Claude Code */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-border/60 px-4 py-2.5">
        <span className="flex items-center gap-2">
          <span className="text-primary" aria-hidden>
            ✻
          </span>
          <span className="font-bold uppercase tracking-wider text-foreground">
            Recorrência de estudo
          </span>
        </span>
        <span className="text-[10px] uppercase text-muted-foreground">
          {streakDays > 0 ? (
            <>
              sequência:{" "}
              <span className="font-bold text-[hsl(var(--success))]">
                {streakDays} {streakDays === 1 ? "dia" : "dias"} 🔥
              </span>
            </>
          ) : (
            "responda hoje para iniciar a sequência"
          )}
        </span>
      </div>

      <div className="overflow-x-auto p-4">
        <div className="flex gap-[3px]" role="img" aria-label={`Atividade de estudo: ${activeDays} dias ativos nas últimas ${weeks.length} semanas`}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => {
                const level = heatLevel(day.count);
                return (
                  <div
                    key={day.date}
                    title={formatLabel(day.date, day.count)}
                    className={cn(
                      "heat-cell h-[11px] w-[11px] rounded-[2px] transition-transform hover:scale-125 hover:ring-1 hover:ring-ring",
                    )}
                    style={{
                      backgroundColor: `hsl(var(--heat-${level}))`,
                      // Onda diagonal: coluna + linha definem o atraso
                      ["--heat-delay" as string]: `${(wi + di) * 18}ms`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span>
            {total30d} questões nos últimos 30 dias · {activeDays} dias ativos
          </span>
          <span className="flex items-center gap-1">
            menos
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className="inline-block h-[9px] w-[9px] rounded-[2px]"
                style={{ backgroundColor: `hsl(var(--heat-${level}))` }}
              />
            ))}
            mais
          </span>
        </div>
      </div>
    </div>
  );
}
