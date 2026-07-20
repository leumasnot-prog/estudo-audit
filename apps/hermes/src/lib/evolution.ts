import { env } from "../env.js";
import { redis } from "../queues.js";

/**
 * Cliente mínimo da Evolution API. O rate limit NÃO vive aqui — é
 * responsabilidade do limiter da fila hermes.send.
 */

interface SendTextResponse {
  key?: { id?: string };
}

/**
 * Modo número único (bot e usuário no MESMO WhatsApp, chat "mensagens
 * para mim mesmo"): tudo que o Hermes envia volta pelo webhook como
 * fromMe. Registramos o id de cada mensagem enviada para o inbound
 * descartá-las — senão o bot responderia a si próprio em loop.
 */
const SENT_KEY_TTL_SECONDS = 6 * 3600; // mesmo TTL da pendência

const sentKey = (messageId: string) => `hermes:sentmsg:${messageId}`;

export async function wasSentByUs(messageId: string): Promise<boolean> {
  return (await redis.exists(sentKey(messageId))) === 1;
}

export async function sendText(
  phoneE164: string,
  text: string,
): Promise<string | null> {
  const number = phoneE164.replace(/\D/g, "");
  const res = await fetch(
    `${env.EVOLUTION_API_URL}/message/sendText/${env.EVOLUTION_INSTANCE}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number, text }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!res.ok) {
    // Lança para o BullMQ aplicar retry/backoff
    throw new Error(
      `Evolution sendText falhou (${res.status}): ${await res.text()}`,
    );
  }

  const body = (await res.json()) as SendTextResponse;
  const messageId = body.key?.id ?? null;
  if (messageId) {
    await redis.set(sentKey(messageId), "1", "EX", SENT_KEY_TTL_SECONDS);
  }
  return messageId;
}
