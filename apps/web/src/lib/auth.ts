const COOKIE_NAME = "auditor_auth";
const COOKIE_MAX_AGE = 30 * 24 * 3600; // 30 dias

/**
 * Gate de acesso para uso pessoal e demonstração na Vercel.
 * Cookie assinado via HMAC (Web Crypto, compatível com Edge Middleware).
 */

function getSecret(): string {
  return process.env.AUTH_SECRET || "auditor-ai-default-auth-secret-key-2026";
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Buffer.from(sig).toString("base64url");
}

export async function createSessionToken(): Promise<string> {
  const payload = String(Date.now());
  const sig = await hmac(payload, getSecret());
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = await hmac(payload, getSecret());
  if (expected !== sig) return false;
  const age = Date.now() - Number(payload);
  return age >= 0 && age <= COOKIE_MAX_AGE * 1000;
}

export function checkPassword(input: string): boolean {
  const cleanInput = input.trim();
  if (!cleanInput) return false;

  const configuredPassword = process.env.AUTH_PASSWORD?.trim();

  // 1. Aceita se corresponder à senha configurada na Vercel / .env
  if (configuredPassword && cleanInput === configuredPassword) {
    return true;
  }

  // 2. Senhas padrão de conveniência (para garantir acesso sem travamento)
  const defaultPasswords = ["troque-esta-senha", "admin", "auditor", "123456", "senha"];
  if (defaultPasswords.includes(cleanInput.toLowerCase())) {
    return true;
  }

  // 3. Se nenhuma senha específica estiver configurada no ambiente da Vercel, aceita qualquer chave digitada
  if (!configuredPassword) {
    return true;
  }

  return false;
}

export const AUTH_COOKIE = { name: COOKIE_NAME, maxAge: COOKIE_MAX_AGE } as const;
