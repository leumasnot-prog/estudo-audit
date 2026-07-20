import { getDemoUser, getSubjectPerformance, isAlert } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const metadata = { title: "Performance" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getDemoUser();
  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum usuário cadastrado — rode o seed primeiro.
      </p>
    );
  }

  const perf = await getSubjectPerformance(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
        <p className="text-sm text-muted-foreground">
          Desempenho completo por disciplina e assunto, nos editais em que você
          está matriculado.
        </p>
      </div>

      {perf.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem dados ainda — matricule-se em um edital e responda questões.
        </p>
      ) : (
        <div className="space-y-4">
          {perf.map((p) => (
            <div
              key={p.subjectId}
              className={cn(
                "rounded-lg border bg-card p-6 shadow-sm",
                isAlert(p) && "border-amber-600/60",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  {p.disciplina}
                  {isAlert(p) && (
                    <span className="ml-2 rounded-full border border-amber-600 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      ⚠ prioridade
                    </span>
                  )}
                </h2>
                <span className="text-sm tabular-nums text-muted-foreground">
                  peso {p.relevancia ?? "—"} · acerto{" "}
                  {p.acerto === null ? "—" : `${p.acerto}%`} · {p.respostas}{" "}
                  respostas
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{p.examName}</p>
              {p.topics.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {p.topics.map((t) => (
                    <li key={t.topicId} className="flex justify-between gap-4">
                      <span>{t.assunto}</span>
                      <span className="shrink-0 tabular-nums">
                        {t.acerto === null ? "—" : `${t.acerto}%`} ({t.respostas})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
