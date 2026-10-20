"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoLogin = { erro: string | null; email: string };

const schema = z.object({
  email: z.email("Digite um e-mail válido.").trim().toLowerCase(),
  senha: z.string().min(6, "A senha tem pelo menos 6 caracteres."),
});

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "");
  const dados = schema.safeParse({ email, senha: formData.get("senha") });
  if (!dados.success) return { erro: dados.error.issues[0].message, email };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: dados.data.email,
    password: dados.data.senha,
  });

  if (error) {
    const mensagens: Record<string, string> = {
      invalid_credentials: "E-mail ou senha incorretos.",
      email_not_confirmed: "Este e-mail ainda não foi confirmado.",
      over_request_rate_limit: "Muitas tentativas. Espere um pouco e tente de novo.",
    };
    return {
      erro: mensagens[error.code ?? ""] ?? "Não foi possível entrar agora. Tente de novo.",
      email,
    };
  }

  redirect("/painel");
}
