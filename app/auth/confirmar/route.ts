import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Volta do login: link do e-mail de confirmação do cadastro e retorno do "Continuar com Google".
 * Aceita os dois formatos do Supabase: `?code=` (padrão do @supabase/ssr, usado também pelo Google)
 * e `?token_hash=&type=` (template de e-mail customizado).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const proximo = url.searchParams.get("proximo") ?? "/painel/nova-barbearia";
  const destino = caminhoInterno(proximo, request.url) ?? "/painel";

  // A pessoa cancelou na tela do Google, ou o Google recusou.
  const erroProvedor = url.searchParams.get("error");
  if (erroProvedor) {
    const motivo = erroProvedor === "access_denied" ? "google-cancelado" : "google";
    return NextResponse.redirect(new URL(`/login?erro=${motivo}`, request.url));
  }

  const supabase = await criarClienteServidor();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  let usuario: User | null = null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    usuario = data.user;
  } else if (tokenHash && tipo) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error;
  }

  const veioDoGoogle = usuario?.identities?.some((i) => i.provider === "google") ?? false;
  if (ok && usuario && veioDoGoogle) {
    return NextResponse.redirect(new URL(await destinoGoogle(supabase, usuario, destino), request.url));
  }
  if (ok) return NextResponse.redirect(new URL(destino, request.url));
  // Link vencido ou aberto em outro navegador: a conta pode já estar confirmada, então manda entrar.
  return NextResponse.redirect(new URL("/login?confirmacao=falhou", request.url));
}

/**
 * Só caminhos do próprio site, para o link não virar redirecionamento aberto.
 * O navegador trata a barra invertida como "/", então "/\\site-falso.com" (que vira
 * "//site-falso.com") também é recusado.
 */
function caminhoInterno(proximo: string, base: string) {
  if (!proximo.startsWith("/") || proximo.startsWith("//") || /[\\\s]/.test(proximo)) return null;
  const origem = new URL(base).origin;
  const destino = new URL(proximo, origem);
  return destino.origin === origem ? destino.pathname + destino.search : null;
}

/**
 * Depois do Google: guarda o nome da conta Google no perfil (se ainda não tem) e,
 * para quem acabou de criar a conta e não tem barbearia, abre direto o cadastro da barbearia.
 * Quem já tinha conta com o mesmo e-mail cai na mesma conta (o Supabase junta as duas).
 */
async function destinoGoogle(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, usuario: User, destino: string) {
  const meta = usuario.user_metadata ?? {};
  const nome = [meta.full_name, meta.name].find((n): n is string => typeof n === "string" && n.trim().length >= 2);
  if (nome) {
    await supabase.from("perfis").update({ nome: nome.trim().slice(0, 120) }).eq("id", usuario.id).is("nome", null);
  }

  if (destino !== "/painel") return destino;
  const contaNova = Date.now() - new Date(usuario.created_at).getTime() < 10 * 60 * 1000;
  if (!contaNova) return destino;
  const { count } = await supabase
    .from("barbearia_usuarios")
    .select("barbearia_id", { count: "exact", head: true })
    .eq("usuario_id", usuario.id);
  return count ? destino : "/painel/nova-barbearia";
}
