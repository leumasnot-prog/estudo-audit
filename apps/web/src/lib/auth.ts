const COOKIE_NAME = "auditor_auth";
const COOKIE_MAX_AGE = 30 * 24 * 3600; // 30 dias

/**
 * Gate de senha única para uso pessoal — não é um sistema de contas.
 * Cookie assinado via HMAC (Web Crypto, compatível com o runtime Edge
 * do middleware) para não guardar a senha em texto puro no navegador.
 */

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || "auditor-ai-default-auth-secret-key-2026";
  return secret;
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
  const password = process.env.AUTH_PASSWORD || "troque-esta-senha";
  return input === password;
}

export const AUTH_COOKIE = { name: COOKIE_NAME, maxAge: COOKIE_MAX_AGE } as const;
