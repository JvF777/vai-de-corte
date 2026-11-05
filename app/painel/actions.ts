"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COOKIE_BARBEARIA, obterContextoPainel } from "@/lib/auth";
import { enviarAviso, pushConfigurado, type Inscricao } from "@/lib/push/envio";
import { avisoTeste } from "@/lib/push/mensagem";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(COOKIE_BARBEARIA);
  redirect("/login");
}

export async function trocarBarbearia(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("barbearia_id"));
  if (!id.success) return;

  // Só aceita barbearias às quais o usuário realmente tem acesso.
  const { vinculos } = await obterContextoPainel();
  if (!vinculos.some((v) => v.barbeariaId === id.data)) return;

  (await cookies()).set(COOKIE_BARBEARIA, id.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/painel",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/painel");
}

// ---------------------------------------------------------------------------
// Avisos no celular (Web Push)
// ---------------------------------------------------------------------------

const schemaInscricao = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
  aparelho: z.string().max(200).optional(),
});

export type ResultadoAviso = { ok: true; mensagem?: string } | { ok: false; erro: string };

/** Liga este aparelho ao usuário logado para receber os avisos. */
export async function salvarInscricaoPush(entrada: unknown): Promise<ResultadoAviso> {
  const dados = schemaInscricao.safeParse(entrada);
  if (!dados.success) return { ok: false, erro: "O navegador mandou dados inválidos. Tente de novo." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("salvar_inscricao_push", {
    p_endpoint: dados.data.endpoint,
    p_p256dh: dados.data.keys.p256dh,
    p_auth: dados.data.keys.auth,
    p_aparelho: dados.data.aparelho ?? null,
  });
  if (error) {
    console.error("salvar_inscricao_push", error);
    return { ok: false, erro: error.message === "SEM_PERMISSAO" && error.details ? error.details : "Não foi possível ligar os avisos agora." };
  }
  return { ok: true };
}

/** Desliga os avisos deste aparelho. O RLS só deixa apagar os aparelhos do próprio usuário. */
export async function removerInscricaoPush(endpoint: string): Promise<ResultadoAviso> {
  const url = z.url().max(1000).safeParse(endpoint);
  if (!url.success) return { ok: true };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("inscricoes_push").delete().eq("endpoint", url.data);
  if (error) return { ok: false, erro: "Não foi possível desligar os avisos agora." };
  return { ok: true };
}

/** Manda um aviso de teste para este aparelho. */
export async function testarAvisoPush(endpoint: string): Promise<ResultadoAviso> {
  if (!pushConfigurado()) {
    return { ok: false, erro: "Os avisos ainda não foram configurados no servidor (faltam as chaves VAPID)." };
  }
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("inscricoes_push")
    .select("endpoint, p256dh, auth")
    .eq("endpoint", endpoint)
    .returns<Inscricao[]>();
  if (error || !data?.length) return { ok: false, erro: "Este aparelho não está com os avisos ligados. Ligue de novo." };

  const { enviados, expirados } = await enviarAviso(data, avisoTeste());
  if (expirados.length) {
    await supabase.from("inscricoes_push").delete().in("endpoint", expirados);
    return { ok: false, erro: "O navegador cancelou os avisos deste aparelho. Ligue de novo." };
  }
  if (!enviados) return { ok: false, erro: "Não foi possível enviar o teste. Tente de novo em instantes." };
  return { ok: true, mensagem: "Teste enviado. Deve chegar em alguns segundos." };
}
