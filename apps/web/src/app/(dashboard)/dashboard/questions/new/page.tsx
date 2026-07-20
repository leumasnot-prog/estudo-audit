import Link from "next/link";
import { prisma, Board, AnswerOption } from "@auditor-ai/db";
import { createQuestion } from "@/lib/actions/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Nova Questão" };
export const dynamic = "force-dynamic";

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Assuntos agrupados por edital/disciplina para o select
  const exams = await prisma.exam.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: {
      subjects: {
        orderBy: { position: "asc" },
        include: {
          topics: {
            where: { parentId: null },
            orderBy: { position: "asc" },
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const hasTopics = exams.some((e) =>
    e.subjects.some((s) => s.topics.length > 0),
  );

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
          Nova Questão
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          CADASTRAR PERGUNTA NO BANCO DE DADOS DE REPETIÇÃO ESPAÇADA.
        </p>
      </div>

      {error === "campos" && (
        <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3 font-mono text-xs text-destructive flex items-center gap-2">
          <span>[!]</span>
          <span>ERRO: Enunciado, comentário e ao menos 2 alternativas são necessários. O gabarito deve apontar para uma alternativa válida.</span>
        </div>
      )}

      {!hasTopics ? (
        <div className="rounded-sm border border-border bg-card/35 backdrop-blur-sm p-6 font-mono text-xs text-center space-y-4">
          <p className="text-muted-foreground">
            &gt;_ NENHUM ASSUNTO OU TÓPICO CADASTRADO NO CATÁLOGO AINDA.
          </p>
          <p className="text-muted-foreground">
            Você deve criar um edital, disciplina e assunto primeiro.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/exams"
              className="inline-flex items-center justify-center border border-primary bg-primary/10 px-4 h-9 font-bold text-primary hover:bg-primary/20 transition-all rounded-none uppercase"
            >
              Ir para Editais
            </Link>
          </div>
        </div>
      ) : (
        <Card className="bg-card/30 backdrop-blur-sm border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="font-orbitron text-xs font-bold uppercase tracking-wider text-primary">
              &gt;_ FORMULÁRIO DE CADASTRO
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form
              action={createQuestion}
              className="space-y-5 font-mono text-xs"
            >
              {/* Topic Select */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="q-topic">
                  Assunto / Tópico Relacionado
                </label>
                <select
                  id="q-topic"
                  name="topicId"
                  required
                  className="flex h-9 w-full border border-border bg-background/50 px-3 py-1 font-mono text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-none text-foreground"
                >
                  {exams.map((exam) =>
                    exam.subjects.map((subject) =>
                      subject.topics.length === 0 ? null : (
                        <optgroup
                          key={subject.id}
                          label={`${exam.institution} ${exam.year} — ${subject.name}`}
                          className="bg-card text-foreground font-sans font-normal"
                        >
                          {subject.topics.map((t) => (
                            <option key={t.id} value={t.id} className="font-mono text-xs">
                              {t.name}
                            </option>
                          ))}
                        </optgroup>
                      ),
                    ),
                  )}
                </select>
              </div>

              {/* Statement */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="q-statement">
                  Enunciado da Questão
                </label>
                <textarea
                  id="q-statement"
                  name="statement"
                  required
                  rows={5}
                  className="flex w-full border border-border bg-background/50 px-3 py-2 font-mono text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-none text-foreground"
                />
              </div>

              {/* Alternatives fieldset */}
              <div className="space-y-3 border border-border/40 p-4 bg-muted/5">
                <span className="text-muted-foreground font-semibold uppercase text-[10px] block">
                  Alternativas (Alternativo: A/B para Certo/Errado)
                </span>
                <div className="space-y-2">
                  {Object.values(AnswerOption).map((key) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-black text-primary font-orbitron">{key}</span>
                      <Input
                        name={`option${key}`}
                        placeholder={
                          key === "A" || key === "B"
                            ? `Texto da alternativa ${key} (obrigatório)`
                            : `Texto da alternativa ${key} (opcional)`
                        }
                        className="bg-background/50 border-border text-foreground font-mono focus-visible:ring-primary rounded-none h-9 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Gabarito, Banca, Ano grid */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="q-correct">
                    Gabarito Oficial
                  </label>
                  <select
                    id="q-correct"
                    name="correctAnswer"
                    className="flex h-9 w-full border border-border bg-background/50 px-3 py-1 font-mono text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-none text-foreground"
                  >
                    {Object.values(AnswerOption).map((key) => (
                      <option key={key} value={key} className="bg-card text-foreground">
                        {key}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="q-board">
                    Banca Examinadora
                  </label>
                  <select
                    id="q-board"
                    name="board"
                    className="flex h-9 w-full border border-border bg-background/50 px-3 py-1 font-mono text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-none text-foreground"
                  >
                    {Object.values(Board).map((b) => (
                      <option key={b} value={b} className="bg-card text-foreground">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="q-year">
                    Ano
                  </label>
                  <Input
                    id="q-year"
                    name="year"
                    type="number"
                    className="bg-background/50 border-border text-foreground font-mono focus-visible:ring-primary rounded-none h-9 text-xs"
                  />
                </div>
              </div>

              {/* Source Exam */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="q-source">
                  Concurso de Origem / Órgão (opcional)
                </label>
                <Input
                  id="q-source"
                  name="sourceExam"
                  placeholder="Ex: SEFAZ-SP 2024 — Auditor Fiscal"
                  className="bg-background/50 border-border text-foreground font-mono focus-visible:ring-primary rounded-none h-9 text-xs"
                />
              </div>

              {/* Explanation */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="q-explanation">
                  Comentário / Justificativa do Gabarito
                </label>
                <textarea
                  id="q-explanation"
                  name="explanation"
                  required
                  rows={4}
                  className="flex w-full border border-border bg-background/50 px-3 py-2 font-mono text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-none text-foreground"
                />
                <p className="text-[10px] text-muted-foreground">
                  * Este comentário será enviado via WhatsApp pelo Hermes após a resolução do aluno.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground font-mono text-xs uppercase font-bold tracking-wider rounded-none hover:bg-primary/90 hover:glow-cyan w-full"
                >
                  Salvar Questão no Banco
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
