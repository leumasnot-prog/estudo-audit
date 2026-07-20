import { prisma } from "../lib/db.js";
import { sendText, wasSentByUs } from "../lib/evolution.js";
import {
  MSG_HELP,
  MSG_NO_PENDING,
  MSG_SESSION_DONE,
  MSG_SKIPPED,
  MSG_STOPPED,
  MSG_UNPARSEABLE,
  formatFeedback,
  formatStatus,
  parseAnswer,
  parseOptions,
} from "../lib/messages.js";
import { clearPending, getPending } from "../lib/pending.js";
import { nextDueAt, qualityFromAnswer, sm2 } from "../lib/sm2.js";
import type { InboundJob } from "../queues.js";
import { advanceRound } from "./send.js";
import { processSession } from "./session.js";

export async function processInbound(job: InboundJob): Promise<void> {
  // Modo número único: mensagens que o próprio Hermes enviou voltam pelo
  // webhook (fromMe no chat consigo mesmo) — descarta para não responder
  // a si próprio em loop.
  if (await wasSentByUs(job.messageId)) return;

  const digits = job.remoteJid.split("@")[0]?.replace(/\D/g, "") ?? "";
  const user = await prisma.user.findFirst({
    where: { phone: `+${digits}`, active: true },
  });
  if (!user) return; // JID desconhecido — descarta (logado pelo worker)

  const text = job.text.trim();

  // -------------------------------------------------------------------
  // 0. Comando: Zerar Histórico (!zerar, !resetar)
  // -------------------------------------------------------------------
  const isWipeCmd = /^(!zerar|!resetar|#zerar)/i.test(text);
  if (isWipeCmd) {
    await prisma.$transaction([
      prisma.answerLog.deleteMany({ where: { userId: user.id } }),
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
    await clearPending(user.id);
    await sendText(
      user.phone,
      "🧹 *Histórico zerado com sucesso!* Todas as suas respostas anteriores foram limpas e os cartões foram restaurados para o estado inicial. Mande *!extra* para começar do zero!",
    );
    return;
  }

  // -------------------------------------------------------------------
  // 1. Comando: Encerrar / Parar / Sair (!encerrar, !parar, !pausar, !cancelar)
  // -------------------------------------------------------------------
  const isStopCmd = /^(!encerrar|!parar|!pausar|!cancelar|!sair|#encerrar)/i.test(text);
  if (isStopCmd) {
    await clearPending(user.id);
    await sendText(user.phone, MSG_STOPPED);
    return;
  }

  // -------------------------------------------------------------------
  // 2. Comando: Ajuda / Menu (!ajuda, !comandos, !help, !menu)
  // -------------------------------------------------------------------
  const isHelpCmd = /^(!ajuda|!comandos|!help|!menu|#ajuda)/i.test(text);
  if (isHelpCmd) {
    await sendText(user.phone, MSG_HELP);
    return;
  }

  // -------------------------------------------------------------------
  // 3. Comando: Status / Desempenho (!status, !desempenho, !meta)
  // -------------------------------------------------------------------
  const isStatusCmd = /^(!status|!desempenho|!meta|#status)/i.test(text);
  if (isStatusCmd) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [answeredToday, total7d, correct7d] = await Promise.all([
      prisma.answerLog.count({
        where: { userId: user.id, answeredAt: { gte: todayStart } },
      }),
      prisma.answerLog.count({
        where: { userId: user.id, answeredAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      }),
      prisma.answerLog.count({
        where: { userId: user.id, answeredAt: { gte: new Date(Date.now() - 7 * 86_400_000) }, isCorrect: true },
      }),
    ]);

    const accuracy7d = total7d > 0 ? Math.round((correct7d / total7d) * 100) : null;
    await sendText(
      user.phone,
      formatStatus(user.name, answeredToday, user.dailyGoal, accuracy7d, 1),
    );
    return;
  }

  // -------------------------------------------------------------------
  // 4. Comando: Reset / Extra / Forçar Nova Rodada
  // -------------------------------------------------------------------
  const isExtraCmd = /^(!extra|!mais|!rodada|!estudar|!reset|!desbloquear|#extra|#reset)/i.test(text);
  if (isExtraCmd) {
    await clearPending(user.id);
    await sendText(
      user.phone,
      "⚡ *Rodada Extra Liberada!* Montando suas questões agora...",
    );
    await processSession({ userId: user.id, localDate: new Date().toISOString().split("T")[0]! });
    return;
  }

  let pending = await getPending(user.id);

  // -------------------------------------------------------------------
  // 5. Sem questão em aberto e sem comando de parada:
  //    Qualquer outra mensagem (ex: "mais", "oi", "manda") inicia rodada extra!
  // -------------------------------------------------------------------
  if (!pending) {
    await sendText(
      user.phone,
      "⚡ *Rodada Extra Liberada!* Montando suas questões agora...",
    );
    await processSession({ userId: user.id, localDate: new Date().toISOString().split("T")[0]! });
    return;
  }

  // -------------------------------------------------------------------
  // 6. Comando: Pular Questão Pendente (!pular, !skip)
  // -------------------------------------------------------------------
  const isSkipCmd = /^(!pular|!skip|#pular)/i.test(text);
  if (isSkipCmd) {
    await clearPending(user.id);
    await sendText(user.phone, MSG_SKIPPED);
    const advanced = await advanceRound(
      user.id,
      pending.position,
      pending.total,
      pending.remaining,
    );
    if (!advanced) await sendText(user.phone, MSG_SESSION_DONE);
    return;
  }

  // -------------------------------------------------------------------
  // 7. Processamento de Resposta da Questão
  // -------------------------------------------------------------------
  const question = await prisma.question.findUnique({
    where: { id: pending.questionId },
  });
  const card = await prisma.spacedRepetitionCard.findUnique({
    where: { id: pending.cardId },
  });
  if (!question || !card) {
    await clearPending(user.id);
    return;
  }

  const options = parseOptions(question);
  const answer = parseAnswer(text, options.length);
  if (!answer) {
    await sendText(user.phone, MSG_UNPARSEABLE(options.length));
    return;
  }

  const isCorrect = answer === question.correctAnswer;
  const responseTimeMs = Math.max(0, job.receivedAt - pending.sentAt);
  const quality = qualityFromAnswer(isCorrect, responseTimeMs);

  const next = sm2(
    {
      easeFactor: Number(card.easeFactor),
      intervalDays: card.intervalDays,
      repetitions: card.repetitions,
      lapses: card.lapses,
    },
    quality,
    { maxIntervalDays: await intervalCap(user.id) },
  );

  // Estado durável numa transação única: log + card, nunca meia-atualização
  await prisma.$transaction([
    prisma.answerLog.create({
      data: {
        userId: user.id,
        questionId: question.id,
        cardId: card.id,
        answer,
        isCorrect,
        channel: "WHATSAPP",
        responseTimeMs,
      },
    }),
    prisma.spacedRepetitionCard.update({
      where: { id: card.id },
      data: {
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        status: next.repetitions === 0 ? "LAPSED" : "REVIEW",
        dueAt: nextDueAt(next.intervalDays),
        lastReviewedAt: new Date(),
      },
    }),
  ]);

  await clearPending(user.id);

  // Pós-transação: envio de feedback e avanço da rodada
  try {
    await sendText(user.phone, formatFeedback(question, isCorrect));
    const advanced = await advanceRound(
      user.id,
      pending.position,
      pending.total,
      pending.remaining,
    );
    if (!advanced) await sendText(user.phone, MSG_SESSION_DONE);
  } catch (err) {
    console.error("[inbound] falha pós-transação:", err);
  }
}

/**
 * Perto da prova, o intervalo é limitado a metade dos dias restantes
 * (menor targetDate entre as matrículas do usuário).
 */
async function intervalCap(userId: string): Promise<number | undefined> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, targetDate: { gte: new Date() } },
    orderBy: { targetDate: "asc" },
    select: { targetDate: true },
  });
  if (!enrollment?.targetDate) return undefined;
  const days = Math.ceil(
    (enrollment.targetDate.getTime() - Date.now()) / 86_400_000,
  );
  return Math.max(1, Math.floor(days / 2));
}
