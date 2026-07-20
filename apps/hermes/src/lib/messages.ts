import type { AnswerOption, Question } from "@auditor-ai/db";

/** Alternativa como armazenada em Question.options (JSON). */
export interface QuestionOption {
  key: AnswerOption;
  text: string;
}

export function parseOptions(question: Question): QuestionOption[] {
  return question.options as unknown as QuestionOption[];
}

/**
 * Interpreta a resposta do usuário. Aceita "a"–"e" e, para questões
 * Certo/Errado (2 alternativas), "certo"/"c" → A e "errado"/"e" → B.
 */
export function parseAnswer(
  text: string,
  optionCount: number,
): AnswerOption | null {
  const t = text.trim().toLowerCase();

  if (optionCount === 2) {
    if (["certo", "c", "correto", "a"].includes(t)) return "A";
    if (["errado", "e", "incorreto", "b"].includes(t)) return "B";
    return null;
  }

  const letters = ["a", "b", "c", "d", "e"] as const;
  const idx = letters.indexOf(t as (typeof letters)[number]);
  if (idx === -1 || idx >= optionCount) return null;
  return t.toUpperCase() as AnswerOption;
}

export function formatQuestion(
  question: Question,
  position: number,
  total: number,
): string {
  const options = parseOptions(question);
  const isCE = options.length === 2;
  const lines = [
    `📚 *Questão ${position}/${total}* — ${question.board}${question.year ? ` ${question.year}` : ""}`,
    "",
    question.statement,
    "",
    ...options.map((o) => `*${o.key})* ${o.text}`),
    "",
    isCE
      ? "Responda *Certo* ou *Errado*."
      : `Responda com a letra (A–${options[options.length - 1]?.key ?? "E"}).`,
  ];
  return lines.join("\n");
}

export function formatFeedback(
  question: Question,
  isCorrect: boolean,
): string {
  const icon = isCorrect ? "✅ *Correta!*" : "❌ *Incorreta.*";
  return [
    `${icon} Gabarito: *${question.correctAnswer}*`,
    "",
    `💡 ${question.explanation}`,
  ].join("\n");
}

export const MSG_HELP = [
  "📋 *Menu de Comandos — Hermes Bot*",
  "",
  "⚡ *!extra* ou *!mais* — Libera uma rodada extra de questões imediatamente",
  "🛑 *!encerrar* ou *!parar* — Cancela a questão em aberto e encerra a sessão",
  "⏭️ *!pular* — Pula a questão atual sem pontuar",
  "📊 *!status* — Mostra suas estatísticas do dia (meta, acertos e sequência)",
  "🔄 *!reset* — Destrava a fila e limpa pendências",
  "",
  "💡 *Resposta:* Mande apenas a letra (*A, B, C, D, E*) ou *Certo / Errado*.",
].join("\n");

export const MSG_STOPPED =
  "🛑 *Sessão encerrada com sucesso!*\n\nNenhuma questão está pendente no momento. Quando quiser voltar a estudar, mande *!extra* ou *!estudar* a qualquer hora!";

export function formatStatus(
  name: string,
  answeredToday: number,
  dailyGoal: number,
  accuracy7d: number | null,
  streakDays: number,
): string {
  const accText = accuracy7d === null ? "N/A" : `${accuracy7d}%`;
  return [
    `📊 *Status de Estudos — ${name}*`,
    "",
    `🎯 *Meta diária:* ${dailyGoal} questões`,
    `✅ *Respondidas hoje:* ${answeredToday} questões`,
    `🔥 *Sequência atual:* ${streakDays} ${streakDays === 1 ? "dia" : "dias"}`,
    `📈 *Precisão média (7d):* ${accText}`,
    "",
    "💡 Mande *!extra* para iniciar mais uma rodada agora mesmo!",
  ].join("\n");
}

export const MSG_NO_PENDING =
  "Sua rodada anterior foi concluída! 👍\n\n💡 *Quer continuar estudando?* Responda *!extra* ou mande qualquer mensagem a qualquer momento para liberar uma rodada extra!";

export const MSG_UNPARSEABLE = (optionCount: number) =>
  optionCount === 2
    ? "Não entendi. 🤔 Responda *Certo* ou *Errado*.\n(Ou envie *!ajuda* para ver os comandos ou *!encerrar* para parar)"
    : "Não entendi. 🤔 Responda apenas com a letra da alternativa (A–E).\n(Ou envie *!ajuda* para ver os comandos ou *!encerrar* para parar)";

export const MSG_SESSION_DONE =
  "🏁 Rodada concluída! Seu desempenho já está no dashboard.\n\n💡 *Dica:* Envie *!extra* a qualquer momento para disparar uma nova rodada extra no WhatsApp!";

export const MSG_REMINDER =
  "⏰ Sua questão ainda está esperando resposta. Bora manter a constância!";

export const MSG_SKIPPED =
  "Sem problemas — pulei essa questão e ela volta em breve. Seguindo!";
