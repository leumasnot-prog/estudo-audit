import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_INSTANCE: z.string().min(1),
  EVOLUTION_WEBHOOK_TOKEN: z.string().min(16),
  PORT: z.coerce.number().int().default(3333),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);
