import Link from "next/link";
import { prisma, type Question, type Prisma } from "@auditor-ai/db";
import { submitAnswer } from "@/lib/actions/train";
import { getDemoUser } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Treinar" };
export const dynamic = "force-dynamic";

interface Option {
  key: string;
  text: string;
}

function parseOptions(options: Prisma.JsonValue): Option[] {
  if (!Array.isArray(options)) return [];
  return options.flatMap((o) =>
    o && typeof o === "object" && "key" in o && "text" in o
      ? [{ key: String(o.key), text: String(o.text) }]
      : [],
  );
}

/** Vencidas primeiro (fila SM-2); senão, uma questão nova aleatória. */
async function pickNextQuestion(userId: string): Promise<{
  question: Question;
  reason: "revisão" | "nova";
} | null> {
  const dueCard = await prisma.spacedRepetitionCard.findFirst({
    where: { userId, dueAt: { lte: new Date() }, question: { active: true } },
    orderBy: { dueAt: "asc" },
    include: { question: true },
  });
  if (dueCard) return { question: dueCard.question, reason: "revisão" };

  const whereNew: Prisma.QuestionWhereInput = {
    active: true,
    cards: { none: { userId } },
    topic: { subject: { exam: { enrollments: { some: { userId } } } } },
  };
  const total = await prisma.question.count({ where: whereNew });
  if (total === 0) return null;
  const question = await prisma.question.findFirst({
    where: whereNew,
    skip: Math.floor(Math.random() * total),
  });
  return question ? { question, reason: "nova" } : null;
}

export default async function TrainPage({
  searchParams,
}: {
  searchParams: Promise<{ last?: string; picked?: string }>;
}) {
  const { last, picked } = await searchParams;
  const user = await getDemoUser();

  if (!user) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center border border-dashed border-destructive/50 bg-destructive/5 p-6 text-center font-mono">
        <p className="text-sm text-destructive font-bold uppercase tracking-widest">
          [!] ERRO CRÍTICO DE SISTEMA
        </p>
        <p className="mt-2 text-xs text-muted-foreground max-w-md">
          Nenhum usuário cadastrado detectado. Rode o comando de sementes (seed) no banco para começar.
        </p>
      </div>
    );
  }

  const [feedback, next] = await Promise.all([
    last ? prisma.question.findUnique({ where: { id: last } }) : null,
    pickNextQuestion(user.id),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page Header */}
      <div className="border-b border-border pb-4 font-mono">
        <Link
          href="/dashboard/questions"
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 uppercase font-semibold"
        >
          <span>&lt;-</span> BACK_TO_QUESTIONS
        </Link>
        <h1 className="mt-2 font-orbitron text-2xl font-black uppercase tracking-wider text-glow-cyan text-primary">
          Estudo Ativo
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          SISTEMA DE REPETIÇÃO ESPAÇADA ATIVO (ALGORITMO SM-2).
        </p>
      </div>

      {/* Answer feedback diagnostic */}
      {feedback && picked && (
        <div
          className={cn(
            "rounded-none border p-4 font-mono text-xs space-y-2 relative overflow-hidden",
            picked === feedback.correctAnswer
              ? "border-emerald-500 bg-emerald-500/5 text-emerald-400 glow-emerald"
              : "border-destructive bg-destructive/5 text-destructive glow-amber"
          )}
        >
          <div className="absolute top-0 right-0 p-2 font-mono text-[8px] opacity-60 tracking-tighter">
            DIAGNOSTIC_REPORT
          </div>
          <p className="font-bold font-orbitron uppercase tracking-widest text-sm flex items-center gap-2">
            {picked === feedback.correctAnswer ? (
              <>
                <span className="animate-pulse">●</span> [✓] RESPOSTA CORRETA
              </>
            ) : (
              <>
                <span className="animate-pulse">●</span> [✗] RESPOSTA INCORRETA
              </>
            )}
          </p>
          <p className="text-[11px] font-semibold text-foreground">
            {picked === feedback.correctAnswer
              ? `A alternativa (${feedback.correctAnswer}) é o gabarito oficial.`
              : `Você marcou a alternativa (${picked}). O gabarito oficial é a alternativa (${feedback.correctAnswer}).`}
          </p>
          <div className="mt-4 border-t border-dashed border-current/20 pt-3">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
              Gabarito Comentado:
            </span>
            <p className="whitespace-pre-line text-foreground/90 bg-black/20 p-3 border border-border/30 leading-relaxed text-xs">
              {feedback.explanation}
            </p>
          </div>
        </div>
      )}

      {/* Question Form */}
      {!next ? (
        <div className="rounded-sm border border-border bg-card/35 backdrop-blur-sm p-6 font-mono text-xs text-center space-y-4">
          <p className="text-muted-foreground">
            &gt;_ NENHUMA QUESTÃO VENCIDA OU DISPONÍVEL NO SEU PERFIL ATUALMENTE.
          </p>
          <p className="text-muted-foreground">
            Verifique se você possui editais ativos cadastrados e matriculados ou se há novas questões cadastradas.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/dashboard/questions/new"
              className="inline-flex items-center justify-center border border-primary bg-primary/10 px-4 h-9 font-bold text-primary hover:bg-primary/20 transition-all rounded-none uppercase"
            >
              Adicionar Nova Questão
            </Link>
            <Link
              href="/dashboard/exams"
              className="inline-flex items-center justify-center border border-border bg-muted/40 px-4 h-9 font-bold text-muted-foreground hover:bg-muted/70 transition-all rounded-none uppercase"
            >
              Matricular em Editais
            </Link>
          </div>
        </div>
      ) : (
        <Card className="bg-card/30 backdrop-blur-sm border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <form
              action={submitAnswer}
              className="space-y-4 font-mono text-xs"
            >
              <input type="hidden" name="questionId" value={next.question.id} />
              <input type="hidden" name="startedAt" value={Date.now()} />
              
              {/* Question metadata */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
                <Badge variant="outline" className={cn(
                  "rounded-none font-bold px-1.5 py-0",
                  next.reason === "revisão" ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-primary bg-primary/10 text-primary"
                )}>
                  {next.reason === "revisão" ? "REVISÃO VENCIDA" : "QUESTÃO NOVA"}
                </Badge>
                <Badge variant="outline" className="border-border rounded-none text-muted-foreground font-bold px-1.5 py-0 bg-muted/20">
                  {next.question.board}
                </Badge>
                {next.question.year && (
                  <Badge variant="outline" className="border-border rounded-none text-muted-foreground font-bold px-1.5 py-0 bg-muted/20">
                    {next.question.year}
                  </Badge>
                )}
                {next.question.sourceExam && (
                  <>
                    <span>·</span>
                    <span className="text-foreground">{next.question.sourceExam}</span>
                  </>
                )}
              </div>

              {/* Statement block */}
              <div className="text-xs leading-relaxed text-foreground/95 bg-muted/5 p-4 border border-border/20 whitespace-pre-line">
                {next.question.statement}
              </div>

              {/* Question options */}
              <div className="space-y-2 pt-2">
                {parseOptions(next.question.options).map((opt) => (
                  <label
                    key={opt.key}
                    className="flex cursor-pointer items-start gap-3 border border-border/50 bg-background/20 px-4 py-3 text-xs transition-all duration-150 hover:bg-primary/5 hover:border-primary/40 group rounded-none"
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={opt.key}
                      required
                      className="mt-0.5 accent-primary h-3.5 w-3.5 border-border focus:ring-primary rounded-none bg-background/50"
                    />
                    <span className="leading-relaxed">
                      <span className="font-bold text-primary mr-1">{opt.key})</span>{" "}
                      <span className="text-foreground/90 group-hover:text-foreground transition-colors">{opt.text}</span>
                    </span>
                  </label>
                ))}
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground font-mono text-xs uppercase font-bold tracking-wider rounded-none hover:bg-primary/90 hover:glow-cyan w-full"
                >
                  Confirmar Resposta &gt;&gt;
                </Button>
              </div>
            </form>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
