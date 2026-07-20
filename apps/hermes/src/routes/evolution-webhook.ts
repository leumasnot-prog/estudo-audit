import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { inboundQueue } from "../queues.js";

/**
 * Webhook da Evolution API (evento MESSAGES_UPSERT).
 * Contrato: valida token, filtra, enfileira e responde 200 em <50ms.
 * Nunca toca no Postgres — todo processamento acontece no inbound worker.
 */

const messageUpsertSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.object({
    key: z.object({
      id: z.string(),
      remoteJid: z.string(),
      fromMe: z.boolean(),
    }),
    message: z
      .object({
        conversation: z.string().optional(),
        extendedTextMessage: z.object({ text: z.string() }).optional(),
      })
      .optional(),
    messageTimestamp: z.coerce.number().optional(),
  }),
});

function extractText(data: z.infer<typeof messageUpsertSchema>["data"]): string | null {
  return (
    data.message?.conversation ??
    data.message?.extendedTextMessage?.text ??
    null
  );
}

export const evolutionWebhook: FastifyPluginAsync = async (app) => {
  app.post("/webhooks/evolution", async (request, reply) => {
    // Única exceção ao "sempre 200": token inválido
    if (request.headers["apikey"] !== env.EVOLUTION_WEBHOOK_TOKEN) {
      return reply.code(401).send({ error: "invalid token" });
    }

    const parsed = messageUpsertSchema.safeParse(request.body);
    if (!parsed.success) {
      request.log.warn({ issues: parsed.error.issues }, "webhook: payload não reconhecido");
      return reply.code(200).send({ ignored: true });
    }

    const { event, data } = parsed.data;
    const text = extractText(data);
    const isGroup = data.key.remoteJid.endsWith("@g.us");

    // fromMe NÃO é descartado aqui: no modo número único (bot = usuário,
    // chat consigo mesmo) a resposta do aluno chega como fromMe. O inbound
    // worker separa o que foi o próprio Hermes que enviou (wasSentByUs).
    if (event !== "messages.upsert" || isGroup || !text) {
      return reply.code(200).send({ ignored: true });
    }

    // jobId = message id → retries do webhook viram no-op
    await inboundQueue.add(
      "inbound",
      {
        messageId: data.key.id,
        remoteJid: data.key.remoteJid,
        text: text.trim(),
        receivedAt: (data.messageTimestamp ?? Math.floor(Date.now() / 1000)) * 1000,
      },
      { jobId: data.key.id },
    );

    return reply.code(200).send({ queued: true });
  });
};
