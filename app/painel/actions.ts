"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COOKIE_BARBEARIA, obterContextoPainel } from "@/lib/auth";
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
