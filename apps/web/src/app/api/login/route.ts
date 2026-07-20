import { NextResponse } from "next/server";
import { AUTH_COOKIE, checkPassword, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  // Só aceita caminhos internos ("/x") — "//host" ou URL absoluta viraria
  // open redirect pós-login.
  const rawNext = String(form.get("next") ?? "");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  let valid: boolean;
  try {
    valid = checkPassword(password);
  } catch {
    valid = false; // AUTH_PASSWORD ausente — trata como senha incorreta, nunca loga
  }

  if (!valid) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", next);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, 303);
  }

  const token = await createSessionToken();
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(AUTH_COOKIE.name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_COOKIE.maxAge,
    path: "/",
  });
  return response;
}
