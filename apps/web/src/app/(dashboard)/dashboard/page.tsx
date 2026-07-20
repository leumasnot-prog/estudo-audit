import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import {
  getDemoUser,
  getKpis,
  getSubjectPerformance,
  getDailyAnalytics,
  getActivityHeatmap,
  isAlert,
} from "@/lib/analytics";
import { resetAllAnswers } from "@/lib/actions/user";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Visão Geral" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getDemoUser();

  if (!user) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center font-sans">
        <p className="text-sm text-destructive font-bold uppercase tracking-wider">
          [!] ERRO CRÍTICO DE SISTEMA
        </p>
        <p className="mt-2 text-xs text-muted-foreground max-w-md">
          Nenhum usuário cadastrado detectado na base de dados. Por favor, execute o comando de sementes (seed) para popular a base:
        </p>
        <code className="mt-4 bg-muted border border-border px-3 py-1 text-xs text-destructive font-mono select-all rounded">
          pnpm --filter @auditor-ai/db seed
        </code>
      </div>
    );
  }

  const [kpis, perf, dailyData, activity] = await Promise.all([
    getKpis(user.id, user.timezone),
    getSubjectPerformance(user.id),
    getDailyAnalytics(user.id, user.timezone),
    getActivityHeatmap(user.id, user.timezone),
  ]);

  const kpiCards = [
    { 
      label: "Questões respondidas (7d)", 
      value: String(kpis.answered7d),
      accent: "blue",
      subtext: "VOLUME DE PROCESSAMENTO",
      detail: null,
    },
    {
      label: "Taxa de acerto (7d)",
      value: kpis.accuracy7d === null ? "—" : `${kpis.accuracy7d}%`,
      accent: kpis.accuracy7d === null ? "muted" : kpis.accuracy7d >= 70 ? "emerald" : "amber",
      subtext: "PRECISÃO GLOBAL",
      detail: kpis.accuracy7d === null ? "0 acertos" : `${kpis.correct7d} de ${kpis.answered7d} acertos`,
    },
    { 
      label: "Revisões vencidas hoje", 
      value: String(kpis.dueToday),
      accent: kpis.dueToday > 0 ? "amber" : "blue",
      subtext: "FILA PENDENTE SM-2",
      detail: null,
    },
    {
      label: "Sequência de dias",
      value: kpis.streakDays > 0 ? `${kpis.streakDays} dias` : "0",
      accent: kpis.streakDays > 0 ? "emerald" : "muted",
      subtext: "ÍNDICE DE CONSTÂNCIA",
      detail: null,
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Visão Geral
            </h1>
            <p className="mt-1 text-xs text-muted-foreground font-sans">
              Acompanhamento de desempenho por disciplinas, métricas de revisão e histórico de estudos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary font-medium">
              OPERADOR: {user.name.toUpperCase()}
            </span>
            <form action={resetAllAnswers}>
              <button
                type="submit"
                title="Apaga todo o histórico de respostas simuladas e reseta o progresso para zero."
                className="text-xs font-medium px-3 py-1 rounded-md border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all cursor-pointer shadow-sm"
              >
                🧹 Resetar Histórico (Zerar)
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(({ label, value, accent, subtext, detail }) => (
          <Card key={label} className={cn(
            "rounded-lg border bg-card transition-all duration-200 hover:border-primary/50 relative overflow-hidden shadow-sm",
            accent === "blue" && "border-l-4 border-l-primary",
            accent === "emerald" && "border-l-4 border-l-emerald-500",
            accent === "amber" && "border-l-4 border-l-amber-500",
            accent === "muted" && "border-l-4 border-l-muted"
          )}>
            <div className="absolute top-2 right-2 font-mono text-[9px] text-muted-foreground/50 select-none tracking-tighter">
              {subtext}
            </div>
            <CardHeader className="p-4 pb-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
                {label}
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-col">
                <span className={cn(
                  "text-2xl font-bold tracking-tight tabular-nums",
                  accent === "blue" && "text-primary",
                  accent === "emerald" && "text-emerald-600 dark:text-emerald-400",
                  accent === "amber" && "text-amber-600 dark:text-amber-400",
                  accent === "muted" && "text-muted-foreground"
                )}>
                  {value}
                </span>
                {detail && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {detail}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recorrência de uso — contribution graph estilo Claude Code */}
      <ActivityHeatmap days={activity} streakDays={kpis.streakDays} />

      {/* Charts Section */}
      <div className="stagger grid gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center justify-between">
              <span>Métricas de Desempenho Diário (Últimos 7 dias)</span>
              <span className="text-xs text-muted-foreground font-sans font-normal lowercase">análise consolidada</span>
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Distribuição do volume de questões por canal (WhatsApp vs. Web) e curva de precisão diária.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <DashboardCharts data={dailyData} />
          </CardContent>
        </Card>

        {/* Subjects Performance List */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center justify-between">
              <span>Desempenho por Disciplina</span>
              <span className="text-xs text-muted-foreground font-sans font-normal lowercase">relatório por edital</span>
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Disciplinas marcadas com alerta possuem relevância alta e taxa de acerto abaixo de 70%.
            </p>
          </CardHeader>
          <CardContent className="p-4">
            {perf.length === 0 ? (
              <div className="flex h-48 items-center justify-center border border-dashed border-border rounded-lg text-xs text-muted-foreground font-mono">
                &gt;_ NENHUM EDITAL MATRICULADO NO PERFIL DE OPERADOR.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-sans text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 pr-4 font-bold">Disciplina</th>
                      <th className="py-2.5 pr-4 text-right font-bold">Peso Edital</th>
                      <th className="py-2.5 pr-4 text-right font-bold">Taxa Acerto</th>
                      <th className="py-2.5 text-right font-bold">Total Respostas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perf.map((p) => {
                      const alert = isAlert(p);
                      return (
                        <tr
                          key={p.subjectId}
                          className={cn(
                            "border-b border-border/40 hover:bg-muted/30 align-top transition-colors last:border-0",
                            alert && "bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-l-2 border-l-amber-500 pl-2"
                          )}
                        >
                          <td className="py-2 pr-4 font-medium" colSpan={4}>
                            <details className="group">
                              <summary className="grid cursor-pointer grid-cols-[1fr_6rem_6rem_6rem] items-center gap-0 list-none [&::-webkit-details-marker]:hidden">
                                <span className="flex items-center gap-2 font-medium text-foreground">
                                  <span className="text-[10px] text-muted-foreground transition-transform group-open:rotate-90">▶</span>
                                  {p.disciplina}
                                  {alert && (
                                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] px-1.5 py-0 rounded font-mono">
                                      ALERTA (&lt;70%)
                                    </Badge>
                                  )}
                                </span>
                                <span className="text-right font-semibold tabular-nums text-foreground">
                                  {p.relevancia ?? "—"}
                                </span>
                                <span className={cn(
                                  "text-right font-semibold tabular-nums",
                                  p.acerto !== null && p.acerto >= 70 ? "text-emerald-600 dark:text-emerald-400" : p.acerto !== null ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                                )}>
                                  {p.acerto === null ? "—" : `${p.acerto}%`}
                                </span>
                                <span className="text-right tabular-nums text-muted-foreground">
                                  {p.respostas}
                                </span>
                              </summary>
                              
                              {p.topics.length > 0 && (
                                <ul className="ml-5 mt-2 space-y-1.5 border-l border-border pl-4 py-1 text-[11px] text-muted-foreground">
                                  {p.topics.map((t) => (
                                    <li
                                      key={t.topicId}
                                      className="flex justify-between gap-4 py-0.5 border-b border-dashed border-border/30 last:border-0"
                                    >
                                      <span className="hover:text-foreground transition-colors">{t.assunto}</span>
                                      <span className={cn(
                                        "shrink-0 font-medium tabular-nums",
                                        t.acerto !== null && t.acerto >= 70 ? "text-emerald-600 dark:text-emerald-400" : t.acerto !== null ? "text-amber-600 dark:text-amber-400" : ""
                                      )}>
                                        {t.acerto === null ? "—" : `${t.acerto}%`}{" "}
                                        <span className="text-[10px] font-normal text-muted-foreground">({t.respostas} resp)</span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
