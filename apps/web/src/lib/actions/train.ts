"use server";

import { prisma, AnswerOption, CardStatus } from "@auditor-ai/db";
import { sm2, qualityFromAnswer, nextDueAt } from "@auditor-ai/db/sm2";
import { redirect } from "next/navigation";
import { getDemoUser } from "@/lib/analytics";

const ANSWER_KEYS = Object.values(AnswerOption) as string[];

/**
 * Registra a resposta do treino web: AnswerLog imutável + upsert do card
 * SM-2 — mesma mecânica do Hermes, para o treino no dashboard alimentar a
 * mesma fila de revisão do WhatsApp.
 */
export async function submitAnswer(formData: FormData) {
  const questionId = String(formData.get("questionId") ?? "");
  const answer = String(formData.get("answer") ?? "");
  const startedAt = Number(formData.get("startedAt"));

  const user = await getDemoUser();
  if (!user || !questionId || !ANSWER_KEYS.includes(answer)) {
    redirect("/dashboard/questions/train");
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) redirect("/dashboard/questions/train");

  const isCorrect = question.correctAnswer === answer;
  const responseTimeMs =
    Number.isFinite(startedAt) && startedAt > 0
      ? Math.max(0, Date.now() - startedAt)
      : null;

  const existing = await prisma.spacedRepetitionCard.findUnique({
    where: { userId_questionId: { userId: user.id, questionId } },
  });

  const quality = qualityFromAnswer(isCorrect, responseTimeMs);
  const next = sm2(
    {
      easeFactor: existing ? Number(existing.easeFactor) : 2.5,
      intervalDays: existing?.intervalDays ?? 0,
      repetitions: existing?.repetitions ?? 0,
      lapses: existing?.lapses ?? 0,
    },
    quality,
  );

  const status: CardStatus = !isCorrect
    ? existing?.status === "REVIEW" || existing?.status === "LAPSED"
      ? "LAPSED"
      : "LEARNING"
    : next.repetitions >= 3
      ? "REVIEW"
      : "LEARNING";

  const cardData = {
    status,
    easeFactor: next.easeFactor,
    intervalDays: next.intervalDays,
    repetitions: next.repetitions,
    lapses: next.lapses,
    dueAt: nextDueAt(next.intervalDays),
    lastReviewedAt: new Date(),
  };

  const card = await prisma.spacedRepetitionCard.upsert({
    where: { userId_questionId: { userId: user.id, questionId } },
    update: cardData,
    create: { userId: user.id, questionId, ...cardData },
  });

  await prisma.answerLog.create({
    data: {
      userId: user.id,
      questionId,
      cardId: card.id,
      answer: answer as AnswerOption,
      isCorrect,
      channel: "WEB",
      responseTimeMs,
    },
  });

  redirect(`/dashboard/questions/train?last=${questionId}&picked=${answer}`);
}
