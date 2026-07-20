import Link from "next/link";
import { prisma, Board } from "@auditor-ai/db";
import { createExam, toggleEnrollment } from "@/lib/actions/catalog";
import { getDemoUser } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Editais" };
export const dynamic = "force-dynamic";

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getDemoUser();
  const [exams, enrollments] = await Promise.all([
    prisma.exam.findMany({
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { subjects: true } },
        subjects: {
          select: { _count: { select: { topics: true } } },
        },
      },
    }),
    user
      ? prisma.enrollment.findMany({
          where: { userId: user.id },
          select: { examId: true },
        })
      : Promise.resolve([]),
  ]);
  const enrolledIds = new Set(enrollments.map((e) => e.examId));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="border-b border-border pb-4">
        <h1 className="font-orbitron text-2xl font-black uppercase tracking-wider text-glow-cyan text-primary">
          Editais
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Gerenciamento e matrícula nos editais do catálogo de Ciências Contábeis.
        </p>
      </div>

      {error === "campos" && (
        <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3 font-mono text-xs text-destructive flex items-center gap-2">
          <span>[!]</span>
          <span>ERRO: Preencha todos os campos obrigatórios para criar o edital.</span>
        </div>
      )}

      {/* Creation Form */}
      <Card className="bg-card/30 backdrop-blur-sm border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="font-orbitron text-xs font-bold uppercase tracking-wider text-primary">
            &gt;_ Registrar Novo Edital
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form
            action={createExam}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end font-mono text-xs"
          >
            <div className="lg:col-span-2 space-y-1.5">
              <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="exam-name">
                Nome do Edital
              </label>
              <Input
                id="exam-name"
                name="name"
                required
                placeholder="Ex: Auditor de Controle Externo"
                className="bg-background/50 border-border text-foreground font-mono focus-visible:ring-primary rounded-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="exam-institution">
                Instituição
              </label>
              <Input
                id="exam-institution"
                name="institution"
                required
                placeholder="Ex: TCE-SP"
                className="bg-background/50 border-border text-foreground font-mono focus-visible:ring-primary rounded-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="exam-board">
                Banca
              </label>
              <select
                id="exam-board"
                name="board"
                className="flex h-9 w-full border border-input bg-background/50 px-3 py-1 font-mono text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 rounded-none text-foreground border-border"
              >
                {Object.values(Board).map((b) => (
                  <option key={b} value={b} className="bg-card text-foreground">
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="exam-year">
                Ano
              </label>
              <Input
                id="exam-year"
                name="year"
                type="number"
                required
                defaultValue={new Date().getFullYear()}
                className="bg-background/50 border-border text-foreground font-mono focus-visible:ring-primary rounded-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
              <Button
                type="submit"
                className="bg-primary text-primary-foreground font-mono text-xs uppercase font-bold tracking-wider rounded-none hover:bg-primary/90 hover:glow-cyan w-full lg:w-auto"
              >
                Criar Edital
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Grid of registered exams */}
      <div className="grid gap-4 lg:grid-cols-2">
        {exams.length === 0 && (
          <div className="lg:col-span-2 flex h-32 items-center justify-center border border-dashed border-muted font-mono text-xs text-muted-foreground bg-muted/5">
            &gt;_ NENHUM EDITAL CADASTRADO NO SISTEMA.
          </div>
        )}
        {exams.map((exam) => {
          const topicCount = exam.subjects.reduce(
            (acc, s) => acc + s._count.topics,
            0,
          );
          const enrolled = enrolledIds.has(exam.id);
          return (
            <Card
              key={exam.id}
              className={cn(
                "flex flex-col justify-between bg-card/30 backdrop-blur-sm border-border transition-all duration-200",
                enrolled ? "border-l-2 border-l-emerald-500 hover:glow-emerald" : "hover:glow-cyan"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-orbitron text-sm font-bold uppercase tracking-wider text-foreground">
                    {exam.name}
                  </span>
                  {enrolled && (
                    <Badge variant="outline" className="border-emerald-500 bg-emerald-500/10 text-emerald-400 text-[9px] px-2 py-0.5 rounded-none font-mono">
                      MATRICULADO
                    </Badge>
                  )}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground uppercase pt-1">
                  {exam.institution} · {exam.board} · {exam.year}
                </div>
              </CardHeader>
              <CardContent className="pb-4 font-mono text-xs">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div>
                    Disciplinas: <span className="font-bold text-foreground">{exam._count.subjects}</span>
                  </div>
                  <div>
                    Assuntos: <span className="font-bold text-foreground">{topicCount}</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 pt-0 border-t border-border/30 mt-auto flex items-center gap-2 font-mono text-xs">
                <Link
                  href={`/dashboard/exams/${exam.id}`}
                  className="inline-flex items-center justify-center border border-primary bg-primary/5 px-3 h-8 font-bold text-primary hover:bg-primary/20 transition-all rounded-none"
                >
                  DISCIPLINAS &amp; ASSUNTOS
                </Link>
                <form action={toggleEnrollment}>
                  <input type="hidden" name="examId" value={exam.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground h-8 font-mono text-xs uppercase rounded-none"
                  >
                    {enrolled ? "Cancelar Matrícula" : "Matricular-se"}
                  </Button>
                </form>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
