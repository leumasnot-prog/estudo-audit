import Link from "next/link";
import { prisma } from "@auditor-ai/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Questões" };
export const dynamic = "force-dynamic";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; topic?: string }>;
}) {
  const { created, topic } = await searchParams;

  const questions = await prisma.question.findMany({
    where: { active: true, ...(topic ? { topicId: topic } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      topic: {
        select: {
          name: true,
          subject: { select: { name: true, exam: { select: { name: true } } } },
        },
      },
      _count: { select: { answers: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-orbitron text-2xl font-black uppercase tracking-wider text-glow-cyan text-primary">
            Questões
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Banco de dados de questões cadastradas para repetição espaçada.
          </p>
        </div>
        <div className="flex gap-2 font-mono text-xs">
          <Link
            href="/dashboard/questions/train"
            className="inline-flex items-center justify-center border border-emerald-500 bg-emerald-500/5 px-4 h-9 font-bold text-emerald-400 hover:bg-emerald-500/20 hover:glow-emerald transition-all rounded-none uppercase"
          >
            Treinar
          </Link>
          <Link
            href="/dashboard/questions/new"
            className="inline-flex items-center justify-center border border-primary bg-primary/10 px-4 h-9 font-bold text-primary hover:bg-primary/20 hover:glow-cyan transition-all rounded-none uppercase"
          >
            Nova Questão
          </Link>
        </div>
      </div>

      {created && (
        <div className="rounded-sm border border-emerald-500/50 bg-emerald-500/10 p-3 font-mono text-xs text-emerald-400 flex items-center gap-2">
          <span>[✓]</span>
          <span>SISTEMA: Nova questão cadastrada com sucesso no banco de dados.</span>
        </div>
      )}

      {/* Questions list */}
      {questions.length === 0 ? (
        <div className="flex h-32 items-center justify-center border border-dashed border-muted font-mono text-xs text-muted-foreground bg-muted/5">
          &gt;_ NENHUMA QUESTÃO CADASTRADA NO SISTEMA.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <Card
              key={q.id}
              className="bg-card/30 backdrop-blur-sm border-border hover:border-primary/30 transition-colors"
            >
              <CardContent className="p-4 font-mono text-xs space-y-3">
                {/* Meta details bar */}
                <div className="flex flex-wrap items-center gap-1.5 border-b border-border/20 pb-2 text-[10px] text-muted-foreground uppercase">
                  <Badge variant="outline" className="border-border rounded-none text-muted-foreground font-bold px-1.5 py-0 bg-muted/20">
                    {q.board}
                  </Badge>
                  {q.year && (
                    <Badge variant="outline" className="border-border rounded-none text-muted-foreground font-bold px-1.5 py-0 bg-muted/20">
                      {q.year}
                    </Badge>
                  )}
                  <span>·</span>
                  <span className="text-foreground font-semibold">{q.topic.subject.exam.name}</span>
                  <span>/</span>
                  <span>{q.topic.subject.name}</span>
                  <span>/</span>
                  <span className="text-primary font-bold">{q.topic.name}</span>
                  <span className="ml-auto text-muted-foreground">
                    RESP: <span className="font-bold text-foreground">{q._count.answers}</span>
                  </span>
                </div>

                {/* Statement text */}
                <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/95 bg-muted/5 p-3 border border-border/20">
                  {q.statement}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
