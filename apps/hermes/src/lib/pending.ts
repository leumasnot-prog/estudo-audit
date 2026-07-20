import { redis } from "../queues.js";

/**
 * Pendência de questão em aberto — invariante: no máximo 1 por usuário.
 * Estado efêmero em Redis (TTL 6h); o histórico durável é o AnswerLog.
 */

export interface PendingQuestion {
  questionId: string;
  cardId: string;
  /** epoch ms do envio — base do responseTimeMs */
  sentAt: number;
  /** Posição na rodada (1-based) e total */
  position: number;
  total: number;
  /** cardIds restantes da rodada, consumidos em ordem */
  remaining: string[];
}

const TTL_SECONDS = 6 * 3600;

const key = (userId: string) => `hermes:pending:${userId}`;

export async function getPending(
  userId: string,
): Promise<PendingQuestion | null> {
  const raw = await redis.get(key(userId));
  return raw ? (JSON.parse(raw) as PendingQuestion) : null;
}

export async function setPending(
  userId: string,
  pending: PendingQuestion,
): Promise<void> {
  await redis.set(key(userId), JSON.stringify(pending), "EX", TTL_SECONDS);
}

export async function clearPending(userId: string): Promise<void> {
  await redis.del(key(userId));
}
