"use server";

import { prisma } from "@auditor-ai/db";
import { revalidatePath } from "next/cache";
import { getDemoUser } from "@/lib/analytics";

/**
 * Atualiza os parâmetros de estudo (Meta Diária/Ronda e Horário) do usuário no banco.
 */
export async function updateUserSettings(formData: FormData) {
  const dailyGoal = Number(formData.get("dailyGoal"));
  const sendHour = Number(formData.get("sendHour"));

  const user = await getDemoUser();
  if (!user) return;

  // Validação básica de limites (permitindo até 100 questões por rodada)
  if (
    Number.isInteger(dailyGoal) &&
    dailyGoal > 0 &&
    dailyGoal <= 100 &&
    Number.isInteger(sendHour) &&
    sendHour >= 0 &&
    sendHour <= 23
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyGoal,
        sendHour,
      },
    });
  }

  revalidatePath("/dashboard/hermes");
}

/**
 * Dispara uma rodada extra de estudos imediatamente para o usuário demo,
 * marcando o dueAt de cartões para agora para garantir envio imediato.
 */
export async function triggerExtraSession() {
  const user = await getDemoUser();
  if (!user) return;

  const now = new Date();

  // Força o vencimento dos cards mais antigos do usuário para que o Hermes dispare uma nova rodada
  await prisma.spacedRepetitionCard.updateMany({
    where: { userId: user.id },
    data: { dueAt: now },
  });

  revalidatePath("/dashboard/hermes");
  revalidatePath("/dashboard");
}

/**
 * Reseta todo o histórico de respostas (AnswerLog) e restaura os cards de repetição espaçada para o estado inicial.
 */
export async function resetAllAnswers() {
  const user = await getDemoUser();
  if (!user) return;

  await prisma.$transaction([
    prisma.answerLog.deleteMany({
      where: { userId: user.id },
    }),
    prisma.spacedRepetitionCard.updateMany({
      where: { userId: user.id },
      data: {
        repetitions: 0,
        intervalDays: 1,
        easeFactor: 2.5,
        lapses: 0,
        status: "NEW",
        dueAt: new Date(),
        lastReviewedAt: null,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/hermes");
  revalidatePath("/dashboard/analytics");
}
