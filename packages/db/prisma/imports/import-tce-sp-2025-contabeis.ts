import { PrismaClient } from "@prisma/client";
import geraisData from "./tce-sp-2025-gerais.json" with { type: "json" };
import especificosData from "./tce-sp-2025-contabeis-especificos.json" with { type: "json" };

const prisma = new PrismaClient();

interface SubjectInput {
  name: string;
  topics: string[];
}

/**
 * Importa TCE-SP 2025 — Auditor de Controle Externo (Especialidade:
 * Ciências Contábeis). Fonte: ANEXO I do edital (extração por negrito do
 * PDF — disciplina = bold run, tópico = split de frases dentro do bloco).
 *
 * Pesos: só o agregado é conhecido pelo edital (20 questões Gerais / 60
 * Específicas, uniforme entre as 6 especialidades). O edital não detalha
 * quantas questões cada disciplina individual vale — por isso
 * Subject.examWeight/Topic.weight ficam null (nunca um chute).
 */
async function main() {
  const exam = await prisma.exam.upsert({
    where: { slug: "tce-sp-2025-contabeis" },
    update: {},
    create: {
      name: "TCE-SP 2025 — Auditor de Controle Externo (Ciências Contábeis)",
      slug: "tce-sp-2025-contabeis",
      institution: "TCE-SP",
      board: "VUNESP",
      year: 2025,
      editalUrl: "TCSP2501_224_20260704142320.pdf",
    },
  });

  if (await prisma.subject.count({ where: { examId: exam.id } })) {
    console.log("Import já aplicado para tce-sp-2025-contabeis — pulando.");
    return;
  }

  let subjectPos = 0;
  // "Legislação" existe tanto em Conhecimentos Gerais quanto em
  // Conhecimentos Específicos (Ciências Contábeis) — mesmo rótulo,
  // conteúdo totalmente diferente. Qualifica pela categoria para não
  // colidir na unique constraint (examId, name) nem confundir no dashboard.
  for (const block of geraisData as SubjectInput[]) {
    await importSubject(exam.id, `${block.name} (Conhecimentos Gerais)`, block.topics, subjectPos++);
  }
  for (const block of especificosData as SubjectInput[]) {
    await importSubject(exam.id, block.name, block.topics, subjectPos++);
  }

  const subjectCount = await prisma.subject.count({ where: { examId: exam.id } });
  const topicCount = await prisma.topic.count({ where: { subject: { examId: exam.id } } });
  console.log(
    `Import concluído: ${subjectCount} disciplinas, ${topicCount} tópicos (TCE-SP 2025 — Ciências Contábeis).`,
  );
}

async function importSubject(
  examId: string,
  name: string,
  topics: string[],
  position: number,
) {
  const subject = await prisma.subject.create({
    data: { examId, name, examWeight: null, position },
  });

  // Dedup de nomes de tópico repetidos dentro da mesma disciplina (o texto
  // corrido do edital legitimamente repete rótulos curtos como "Conceito"
  // em contextos diferentes) — a unique constraint exige nomes distintos.
  const seen = new Map<string, number>();
  const data = topics.map((rawName, i) => {
    const count = (seen.get(rawName) ?? 0) + 1;
    seen.set(rawName, count);
    const name = count > 1 ? `${rawName} (${count})` : rawName;
    return { subjectId: subject.id, name, weight: null, position: i };
  });

  // createMany é mais rápido, mas perde erros individuais silenciosamente
  // em caso de nome > limite de coluna — aceitável aqui pois já sanitizamos.
  await prisma.topic.createMany({ data });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
