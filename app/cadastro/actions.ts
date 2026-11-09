"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoCadastro = {
  erro: string | null;
  campos?: Record<string, string>;
  /** E-mail de confirmação enviado (quando o Supabase exige confirmar o e-mail). */
  confirmar?: boolean;
  nome: string;
  email: string;
};

const schema = z.object({
  nome: z.string().trim().min(2, "Digite o seu nome.").max(120, "Use até 120 caracteres."),
  email: z.email("Digite um e-mail válido.").trim().toLowerCase(),
  senha: z.string().min(8, "Use pelo menos 8 caracteres.").max(72, "Use até 72 caracteres."),
});

const DESTINO = "/painel/nova-barbearia";

export async function criarConta(_anterior: EstadoCadastro, formData: FormData): Promise<EstadoCadastro> {
  const nome = String(formData.get("nome") ?? "");
  const email = String(formData.get("email") ?? "");
  // Campo escondido: só robô preenche.
  if (String(formData.get("site") ?? "")) return { erro: null, confirmar: true, nome, email };

  const dados = schema.safeParse({ nome, email, senha: formData.get("senha") ?? "" });
  if (!dados.success) {
    const campos: Record<string, string> = {};
    for (const i of dados.error.issues) campos[String(i.path[0])] ??= i.message;
    return { erro: null, campos, nome, email };
  }

  const cab = await headers();
  const host = cab.get("x-forwarded-host") ?? cab.get("host");
  const protocolo = cab.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origem = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? `${protocolo}://${host}`;

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email: dados.data.email,
    password: dados.data.senha,
    options: {
      data: { nome: dados.data.nome },
      emailRedirectTo: `${origem}/auth/confirmar?proximo=${encodeURIComponent(DESTINO)}`,
    },
  });

  if (error) {
    const mensagens: Record<string, string> = {
      user_already_exists: "Já existe uma conta com este e-mail. Entre pela tela de login.",
      email_exists: "Já existe uma conta com este e-mail. Entre pela tela de login.",
      weak_password: "Senha fraca. Misture letras e números.",
      over_email_send_rate_limit: "Muitos cadastros agora. Espere alguns minutos e tente de novo.",
      over_request_rate_limit: "Muitas tentativas. Espere um pouco e tente de novo.",
      email_address_invalid: "Este e-mail não foi aceito. Confira se digitou certo.",
      signup_disabled: "O cadastro está fechado no momento.",
    };
    console.error("criarConta", error.code, error.message);
    return { erro: mensagens[error.code ?? ""] ?? "Não foi possível criar a conta agora. Tente de novo.", nome, email };
  }

  // Confirmação de e-mail desligada no Supabase: já entra logado.
  if (data.session) redirect(DESTINO);

  // Com confirmação ligada, o Supabase não diz se o e-mail já existia (identities vazio).
  if (data.user && data.user.identities?.length === 0) {
    return { erro: "Já existe uma conta com este e-mail. Entre pela tela de login.", nome, email };
  }
  return { erro: null, confirmar: true, nome, email: dados.data.email };
}
