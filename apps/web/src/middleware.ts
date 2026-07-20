import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE.name)?.value;

  // Falha fechado: qualquer erro (ex: AUTH_SECRET ausente) bloqueia o
  // acesso em vez de deixar passar — nunca abrir o app por acidente.
  let authenticated = false;
  try {
    authenticated = await verifySessionToken(token);
  } catch {
    authenticated = false;
  }

  if (authenticated) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Libera a própria /login, a API que valida a senha e assets estáticos;
  // tudo o mais exige sessão.
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
