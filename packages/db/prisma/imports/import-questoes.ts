import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, type Board, type AnswerOption } from "@prisma/client";

const prisma = new PrismaClient();
const QUESTOES_DIR = join(dirname(fileURLToPath(import.meta.url)), "questoes");

interface QuestionInput {
  subject: string;
  topic: string;
  statement: string;
  options: { key: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  difficulty?: number;
}

interface FileInput {
  sourceExam: string;
  board: Board;
  year: number;
  questions: QuestionInput[];
}

/**
 * Importa as questões de prova salvas em questoes/*.json para o banco.
 * Cria (ou reaproveita) um Exam por arquivo e a hierarquia
 * Subject -> Topic -> Question. Idempotente: pula arquivos cujo exam
 * já tem questões importadas.
 */
async function main() {
  const files = readdirSync(QUESTOES_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("Nenhum JSON em questoes/ — nada a importar.");
    return;
  }

  for (const file of files) {
    const data = JSON.parse(
      readFileSync(join(QUESTOES_DIR, file), "utf-8"),
    ) as FileInput;
    const slug = `banco-${file.replace(/\.json$/, "")}`;

    const exam = await prisma.exam.upsert({
      where: { slug },
      update: {},
      create: {
        name: data.sourceExam,
        slug,
        institution: data.sourceExam.split(" ")[0] ?? "OUTRO",
        board: data.board,
        year: data.year,
      },
    });

    const existing = await prisma.question.count({
      where: { topic: { subject: { examId: exam.id } } },
    });
    if (existing > 0) {
      console.log(`${file}: já importado (${existing} questões) — pulando.`);
      continue;
    }

    let subjectPos = 0;
    const subjectIds = new Map<string, string>();
    const topicIds = new Map<string, string>();
    let count = 0;

    for (const q of data.questions) {
      let subjectId = subjectIds.get(q.subject);
      if (!subjectId) {
        const subject = await prisma.subject.create({
          data: { examId: exam.id, name: q.subject, position: subjectPos++ },
        });
        subjectId = subject.id;
        subjectIds.set(q.subject, subjectId);
      }

      const topicKey = `${q.subject}::${q.topic}`;
      let topicId = topicIds.get(topicKey);
      if (!topicId) {
        const topic = await prisma.topic.create({
          data: { subjectId, name: q.topic, position: topicIds.size },
        });
        topicId = topic.id;
        topicIds.set(topicKey, topicId);
      }

      await prisma.question.create({
        data: {
          topicId,
          statement: q.statement,
          options: q.options,
          correctAnswer: q.correctAnswer as AnswerOption,
          explanation: q.explanation,
          board: data.board,
          year: data.year,
          sourceExam: data.sourceExam,
          difficulty: q.difficulty ?? 3,
        },
      });
      count++;
    }

    console.log(
      `${file}: ${count} questões em ${subjectIds.size} disciplinas / ${topicIds.size} assuntos (exam "${exam.slug}").`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
