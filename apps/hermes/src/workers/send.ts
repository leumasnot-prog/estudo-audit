import { prisma } from "../lib/db.js";
import { sendText } from "../lib/evolution.js";
import { formatQuestion } from "../lib/messages.js";
import { getPending, setPending } from "../lib/pending.js";
import { REMINDER_DELAY_MS, reminderQueue, sendQueue, type SendJob } from "../queues.js";

export async function processSend(job: SendJob): Promise<void> {
  const { userId, cardId, position, total, remaining } = job;

  // Invariante: 1 pendência por usuário. Se já existe, este job é
  // duplicata (retry) ou chegou fora de ordem — não sobrescreve.
  const existing = await getPending(userId);
  if (existing) return;

  const card = await prisma.spacedRepetitionCard.findUnique({
    where: { id: cardId },
    include: { question: true, user: true },
  });

  // Card sumiu ou questão desativada no meio da rodada → pula para a próxima
  if (!card || !card.question.active) {
    await advanceRound(userId, position, total, remaining);
    return;
  }

  // Ordem: envia antes de gravar pendência. Se o set falhar, o retry
  // reenvia a mensagem (duplicata inócua) — melhor que pendência órfã.
  await sendText(card.user.phone, formatQuestion(card.question, position, total));

  await setPending(userId, {
    questionId: card.questionId,
    cardId,
    sentAt: Date.now(),
    position,
    total,
    remaining,
  });

  if (card.status === "NEW") {
    await prisma.spacedRepetitionCard.update({
      where: { id: cardId },
      data: { status: "LEARNING" },
    });
  }

  await reminderQueue.add(
    "reminder",
    { userId, cardId, attempt: 1 },
    { delay: REMINDER_DELAY_MS },
  );
}

/** Enfileira o próximo card da rodada, se houver. */
export async function advanceRound(
  userId: string,
  position: number,
  total: number,
  remaining: string[],
): Promise<boolean> {
  const [next, ...rest] = remaining;
  if (!next) return false;
  await sendQueue.add("send", {
    userId,
    cardId: next,
    position: position + 1,
    total,
    remaining: rest,
  });
  return true;
}
