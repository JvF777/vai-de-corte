import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const ROTAS_PROTEGIDAS = ["/painel"];
const ROTAS_SO_DESLOGADO = ["/login"];

function comecaCom(pathname: string, rotas: string[]) {
  return rotas.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/**
 * Roda antes de cada requisição: renova o token do Supabase (gravando os
 * cookies novos na resposta) e faz o redirecionamento otimista de login.
 * A checagem de verdade continua no servidor (lib/auth.ts) e no RLS.
 */
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const { url, chave } = supabaseEnv();

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar, headers) {
        cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesParaGravar.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => resposta.headers.set(k, v));
      },
    },
  });

  // Não coloque código entre criar o cliente e getClaims(): é isso que renova a sessão.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  const redirecionar = (destino: string) => {
    const r = NextResponse.redirect(new URL(destino, request.url));
    // Mantém os cookies renovados no redirecionamento.
    resposta.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!logado && comecaCom(pathname, ROTAS_PROTEGIDAS)) return redirecionar("/login");
  if (logado && comecaCom(pathname, ROTAS_SO_DESLOGADO)) return redirecionar("/painel");

  return resposta;
}
