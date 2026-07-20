import { prisma } from "../lib/db.js";
import { sendText } from "../lib/evolution.js";
import { MSG_REMINDER, MSG_SKIPPED } from "../lib/messages.js";
import { clearPending, getPending } from "../lib/pending.js";
import { nextDueAt } from "../lib/sm2.js";
import { REMINDER_DELAY_MS, reminderQueue, type ReminderJob } from "../queues.js";
import { advanceRound } from "./send.js";

export async function processReminder({
  userId,
  cardId,
  attempt,
}: ReminderJob): Promise<void> {
  const pending = await getPending(userId);
  // Já respondida (ou outra questão em aberto) — lembrete obsoleto
  if (!pending || pending.cardId !== cardId) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  if (attempt === 1) {
    await sendText(user.phone, MSG_REMINDER);
    await reminderQueue.add(
      "reminder",
      { userId, cardId, attempt: 2 },
      { delay: REMINDER_DELAY_MS },
    );
    return;
  }

  // 2º timeout: skip — card volta amanhã SEM penalizar o easeFactor
  // (ausência não é erro conceitual)
  await prisma.spacedRepetitionCard.update({
    where: { id: cardId },
    data: { dueAt: nextDueAt(1) },
  });
  await clearPending(userId);
  await sendText(user.phone, MSG_SKIPPED);
  await advanceRound(userId, pending.position, pending.total, pending.remaining);
}
