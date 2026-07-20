import { Worker } from "bullmq";
import {
  QUEUES,
  redis,
  tickQueue,
  type InboundJob,
  type ReminderJob,
  type SendJob,
  type SessionJob,
} from "../queues.js";
import { processInbound } from "./inbound.js";
import { processReminder } from "./reminder.js";
import { processSend } from "./send.js";
import { processSession } from "./session.js";
import { processTick } from "./tick.js";

/**
 * Processo dedicado de workers — deploy separado do server HTTP.
 * Contratos de concorrência/limiter: hermes-architecture.md §2.
 */

const tickWorker = new Worker(QUEUES.tick, () => processTick(), {
  connection: redis,
  concurrency: 1,
});

const sessionWorker = new Worker<SessionJob>(
  QUEUES.session,
  (job) => processSession(job.data),
  { connection: redis, concurrency: 5 },
);

const sendWorker = new Worker<SendJob>(
  QUEUES.send,
  (job) => processSend(job.data),
  {
    connection: redis,
    concurrency: 5,
    // Limiter GLOBAL da fila: 2 msgs/s independente do nº de réplicas
    limiter: { max: 2, duration: 1_000 },
  },
);

const inboundWorker = new Worker<InboundJob>(
  QUEUES.inbound,
  (job) => processInbound(job.data),
  { connection: redis, concurrency: 10 },
);

const reminderWorker = new Worker<ReminderJob>(
  QUEUES.reminder,
  (job) => processReminder(job.data),
  { connection: redis, concurrency: 5 },
);

// Agendador do cron horário (idempotente — substitui se já existir)
await tickQueue.upsertJobScheduler("hermes-tick-hourly", {
  pattern: "0 * * * *",
});

const workers = [
  tickWorker,
  sessionWorker,
  sendWorker,
  inboundWorker,
  reminderWorker,
];

for (const worker of workers) {
  worker.on("failed", (job, err) => {
    console.error(`[${worker.name}] job ${job?.id} falhou:`, err.message);
  });
  worker.on("error", (err) => {
    console.error(`[${worker.name}] erro:`, err.message);
  });
}

console.log("Hermes workers ativos:", workers.map((w) => w.name).join(", "));

const shutdown = async () => {
  await Promise.all(workers.map((w) => w.close()));
  await redis.quit();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
