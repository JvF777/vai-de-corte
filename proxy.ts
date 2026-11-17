import { NextResponse, type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  // Se o endereço de volta não estiver liberado no Supabase (Redirect URLs), ele manda
  // o login do Google (ou o link do e-mail) para a página inicial com ?code=.
  // Aqui o código segue para /auth/confirmar, que termina o login normalmente.
  if (pathname === "/") {
    const code = searchParams.get("code");
    if (!code) return NextResponse.next();
    const destino = new URL("/auth/confirmar", request.url);
    destino.searchParams.set("code", code);
    destino.searchParams.set("proximo", "/painel");
    return NextResponse.redirect(destino);
  }
  return atualizarSessao(request);
}

export const config = {
  // Só o painel, o login e o cadastro precisam de sessão. O link público (/barbearia/...) fica de fora.
  // A página inicial entra só para o caso do ?code= acima.
  matcher: ["/", "/painel/:path*", "/login", "/cadastro"],
};
