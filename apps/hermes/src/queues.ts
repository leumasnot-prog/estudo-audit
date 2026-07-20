import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "./env.js";

// maxRetriesPerRequest: null é requisito do BullMQ para conexões de worker
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const QUEUES = {
  tick: "hermes.tick",
  session: "hermes.session",
  send: "hermes.send",
  inbound: "hermes.inbound",
  reminder: "hermes.reminder",
} as const;

/** Delay do lembrete de questão sem resposta (2 tentativas). */
export const REMINDER_DELAY_MS = 60 * 60 * 1000;

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 3_000 },
  removeOnComplete: { age: 24 * 3600 },
  removeOnFail: false, // retém para inspeção (DLQ implícita)
} as const;

// ---------------------------------------------------------------------
// Payloads tipados por fila
// ---------------------------------------------------------------------

/** tick não carrega payload — o worker resolve os usuários na hora. */
export type TickJob = Record<string, never>;

export interface SessionJob {
  userId: string;
  /** YYYY-MM-DD na timezone do usuário — compõe o jobId idempotente */
  localDate: string;
}

export interface SendJob {
  userId: string;
  /** Card da vez — todo item da rodada tem card (criado pela session) */
  cardId: string;
  /** Posição na rodada (1-based) e total, para o cabeçalho da mensagem */
  position: number;
  total: number;
  /** cardIds restantes da rodada, consumidos em ordem */
  remaining: string[];
}

export interface InboundJob {
  /** message.key.id da Evolution — também usado como jobId (dedup) */
  messageId: string;
  /** remoteJid bruto, ex: 5516999998888@s.whatsapp.net */
  remoteJid: string;
  text: string;
  /** epoch ms do messageTimestamp — base do responseTimeMs */
  receivedAt: number;
}

export interface ReminderJob {
  userId: string;
  cardId: string;
  attempt: 1 | 2;
}

const opts = { connection: redis, defaultJobOptions };

export const tickQueue = new Queue<TickJob>(QUEUES.tick, opts);
export const sessionQueue = new Queue<SessionJob>(QUEUES.session, opts);
export const sendQueue = new Queue<SendJob>(QUEUES.send, opts);
export const inboundQueue = new Queue<InboundJob>(QUEUES.inbound, opts);
export const reminderQueue = new Queue<ReminderJob>(QUEUES.reminder, opts);
