import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@auditor-ai/db";
import { createSubject, createTopic } from "@/lib/actions/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Disciplinas e Assuntos" };
export const dynamic = "force-dynamic";

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ examId }, { error }] = await Promise.all([params, searchParams]);

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      subjects: {
        orderBy: { position: "asc" },
        include: {
          topics: {
            where: { parentId: null },
            orderBy: { position: "asc" },
            include: { _count: { select: { questions: true, children: true } } },
          },
        },
      },
    },
  });
  if (!exam) notFound();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="border-b border-border pb-4 font-mono">
        <Link
          href="/dashboard/exams"
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 uppercase font-semibold"
        >
          <span>&lt;-</span> BACK_TO_EXAMS
        </Link>
        <h1 className="mt-2 font-orbitron text-2xl font-black uppercase tracking-wider text-glow-cyan text-primary">
          {exam.name}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground uppercase">
          {exam.institution} · {exam.board} · {exam.year}
        </p>
      </div>

      {/* Errors */}
      {error === "campos" && (
        <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3 font-mono text-xs text-destructive flex items-center gap-2">
          <span>[!]</span>
          <span>ERRO: Preencha o nome do item antes de salvar.</span>
        </div>
      )}
      {(error === "duplicada" || error === "duplicado") && (
        <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3 font-mono text-xs text-destructive flex items-center gap-2">
          <span>[!]</span>
          <span>ERRO: Item duplicado. Insira um nome diferente.</span>
        </div>
      )}

      {/* Add Subject Form */}
      <Card className="bg-card/30 backdrop-blur-sm border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="font-orbitron text-xs font-bold uppercase tracking-wider text-primary">
            &gt;_ Registrar Nova Disciplina
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form
            action={createSubject}
            className="flex flex-wrap items-end gap-4 font-mono text-xs"
          >
            <input type="hidden" name="examId" value={exam.id} />
            <div className="min-w-[260px] flex-1 space-y-1.5">
              <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="subject-name">
                Nome da Disciplina
              </label>
              <Input
                id="subject-name"
                name="name"
                required
                placeholder="Ex: Direito Administrativo"
                className="bg-background/50 border-border text-foreground font-mono focus-visible:ring-primary rounded-none"
              />
            </div>
            <div className="w-32 space-y-1.5">
              <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="subject-weight">
                Peso (opcional)
              </label>
              <Input
                id="subject-weight"
                name="examWeight"
                inputMode="decimal"
                placeholder="Ex: 15"
                className="bg-background/50 border-border text-foreground font-mono focus-visible:ring-primary rounded-none"
              />
            </div>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground font-mono text-xs uppercase font-bold tracking-wider rounded-none hover:bg-primary/90 hover:glow-cyan"
            >
              Adicionar Disciplina
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subjects list */}
      {exam.subjects.length === 0 ? (
        <div className="flex h-32 items-center justify-center border border-dashed border-muted font-mono text-xs text-muted-foreground bg-muted/5">
          &gt;_ NENHUMA DISCIPLINA CADASTRADA NESTE EDITAL.
        </div>
      ) : (
        <div className="space-y-4">
          {exam.subjects.map((subject) => (
            <Card
              key={subject.id}
              className="bg-card/30 backdrop-blur-sm border-border hover:border-primary/40 transition-colors"
            >
              <CardHeader className="pb-3 border-b border-border/30">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-orbitron text-sm font-bold uppercase tracking-wider text-foreground">
                    {subject.name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">
                    Peso: <span className="font-bold text-foreground">{subject.examWeight === null ? "—" : String(subject.examWeight)}</span> ·{" "}
                    Assuntos: <span className="font-bold text-foreground">{subject.topics.length}</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 font-mono text-xs space-y-4">
                {/* Topics list */}
                {subject.topics.length > 0 && (
                  <ul className="space-y-2">
                    {subject.topics.map((topic) => (
                      <li
                        key={topic.id}
                        className="flex items-center justify-between gap-4 border border-border/50 bg-background/30 px-3 py-2 text-foreground"
                      >
                        <span className="font-semibold text-xs">{topic.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground uppercase font-bold">
                          {topic._count.questions} QUESTÕES
                          {topic._count.children > 0 &&
                            ` · ${topic._count.children} SUBTÓPICOS`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add Topic Inline Form */}
                <form
                  action={createTopic}
                  className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/20"
                >
                  <input type="hidden" name="subjectId" value={subject.id} />
                  <input type="hidden" name="examId" value={exam.id} />
                  <Input
                    name="name"
                    required
                    placeholder="Novo assunto (ex: Balanço Patrimonial)"
                    className="min-w-[240px] flex-1 bg-background/50 border-border text-foreground font-mono focus-visible:ring-primary rounded-none h-9 text-xs"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground h-9 font-mono text-xs uppercase rounded-none"
                  >
                    Adicionar Assunto
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
