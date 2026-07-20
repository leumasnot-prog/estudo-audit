import Fastify from "fastify";
import { env } from "./env.js";
import { evolutionWebhook } from "./routes/evolution-webhook.js";

const app = Fastify({
  logger: { level: "info" },
  // Evolution pode reenviar payloads grandes com mídia; limite defensivo
  bodyLimit: 1_048_576,
});

app.get("/health", async () => ({ status: "ok" }));

await app.register(evolutionWebhook);

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
