"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Para onde a pessoa pode ir depois do Google. Qualquer outra coisa vira "/painel". */
const DESTINOS = new Set(["/painel", "/painel/nova-barbearia"]);

/**
 * "Continuar com Google": pede ao Supabase o link de login do Google e manda a pessoa para lá.
 * Na volta, o Google cai em /auth/confirmar, que troca o código pela sessão.
 * Serve para entrar e para criar conta: se o e-mail já tem conta, o Supabase junta as duas.
 */
export async function entrarComGoogle(formData: FormData) {
  const pedido = String(formData.get("proximo") ?? "");
  const proximo = DESTINOS.has(pedido) ? pedido : "/painel";

  // O endereço precisa ser o mesmo desta requisição: o cookie de segurança (PKCE) fica nele.
  const cab = await headers();
  const host = cab.get("x-forwarded-host") ?? cab.get("host");
  const protocolo = cab.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${protocolo}://${host}/auth/confirmar?proximo=${encodeURIComponent(proximo)}`,
      // Deixa escolher a conta, para quem tem mais de um Gmail no celular.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    console.error("entrarComGoogle", error?.code, error?.message);
    redirect("/login?erro=google");
  }
  redirect(data.url);
}
