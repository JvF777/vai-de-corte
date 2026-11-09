import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Link do e-mail de confirmação do cadastro. Aceita os dois formatos do Supabase:
 * `?code=` (padrão do @supabase/ssr) e `?token_hash=&type=` (template de e-mail customizado).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const proximo = url.searchParams.get("proximo") ?? "/painel/nova-barbearia";
  // Só caminhos internos, para o link não virar redirecionamento aberto.
  const destino = proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/painel";

  const supabase = await criarClienteServidor();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && tipo) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error;
  }

  if (ok) return NextResponse.redirect(new URL(destino, request.url));
  // Link vencido ou aberto em outro navegador: a conta pode já estar confirmada, então manda entrar.
  return NextResponse.redirect(new URL("/login?confirmacao=falhou", request.url));
}
