import { prisma } from "../lib/db.js";
import { sendQueue, type SessionJob } from "../queues.js";

/**
 * Monta a rodada diária ou extra: cards vencidos primeiro, cota restante
 * preenchida com questões novas priorizadas por peso da disciplina.
 * Se não houver vencidos nem novos, recicla os cards revisados há mais tempo.
 */
export async function processSession(
  job: SessionJob & { forceCount?: number },
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: job.userId } });
  if (!user || !user.active) return;

  const targetCount = job.forceCount ?? user.dailyGoal ?? 5;
  const now = new Date();

  // 1. Cards vencidos do usuário
  const dueCards = await prisma.spacedRepetitionCard.findMany({
    where: { userId: user.id, dueAt: { lte: now }, question: { active: true } },
    orderBy: { dueAt: "asc" },
    take: targetCount,
    select: { id: true },
  });

  const slots = targetCount - dueCards.length;
  let newCardIds: string[] = [];

  if (slots > 0) {
    // 2. Novas questões (sem card do usuário)
    const fresh = await prisma.question.findMany({
      where: {
        active: true,
        cards: { none: { userId: user.id } },
        topic: {
          subject: { exam: { enrollments: { some: { userId: user.id } } } },
        },
      },
      orderBy: [
        { topic: { subject: { examWeight: "desc" } } },
        { difficulty: "asc" },
      ],
      take: slots,
      select: { id: true },
    });

    if (fresh.length > 0) {
      const created = await prisma.$transaction(
        fresh.map((q) =>
          prisma.spacedRepetitionCard.create({
            data: { userId: user.id, questionId: q.id, dueAt: now },
            select: { id: true },
          }),
        ),
      );
      newCardIds = created.map((c) => c.id);
    }
  }

  let cardIds = [...dueCards.map((c) => c.id), ...newCardIds];

  // 3. Fallback p/ Rodada Extra: Se não há cards vencidos nem novos (todas já respondidas),
  // seleciona os cards existentes revisados há mais tempo para garantir que a rodada funcione!
  if (cardIds.length === 0) {
    const extraCards = await prisma.spacedRepetitionCard.findMany({
      where: { userId: user.id, question: { active: true } },
      orderBy: { lastReviewedAt: "asc" },
      take: targetCount,
      select: { id: true },
    });
    cardIds = extraCards.map((c) => c.id);
  }

  const [first, ...remaining] = cardIds;
  if (!first) return;

  await sendQueue.add("send", {
    userId: user.id,
    cardId: first,
    position: 1,
    total: cardIds.length,
    remaining,
  });
}
