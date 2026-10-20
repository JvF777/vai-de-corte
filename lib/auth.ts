import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Papel = "dono" | "barbeiro";

export type Vinculo = {
  barbeariaId: string;
  nome: string;
  slug: string;
  papel: Papel;
};

export type ContextoPainel = {
  usuario: { id: string; email: string | null };
  vinculos: Vinculo[];
  /** Barbearia que o painel está mostrando. Nulo se o usuário não tem vínculo nenhum. */
  atual: Vinculo | null;
};

/** Cookie com a barbearia escolhida, para quem tem acesso a mais de uma. */
export const COOKIE_BARBEARIA = "barbearia_atual";

type LinhaVinculo = {
  papel: Papel;
  barbearia: { id: string; nome: string; slug: string } | null;
};

/**
 * Ponto único para saber quem está logado e em qual barbearia (Data Access Layer).
 * Redireciona para /login se não houver sessão válida. O `cache` evita repetir
 * as consultas quando vários componentes da mesma página chamam a função.
 */
export const obterContextoPainel = cache(async (): Promise<ContextoPainel> => {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  if (error || !usuarioId) redirect("/login");

  // O RLS só devolve os vínculos do próprio usuário.
  const { data: linhas, error: erroVinculos } = await supabase
    .from("barbearia_usuarios")
    .select("papel, barbearia:barbearias(id, nome, slug)")
    .eq("usuario_id", usuarioId)
    .returns<LinhaVinculo[]>();
  if (erroVinculos) throw new Error(`Erro ao carregar barbearias: ${erroVinculos.message}`);

  const vinculos: Vinculo[] = (linhas ?? [])
    .filter((l) => l.barbearia)
    .map((l) => ({
      barbeariaId: l.barbearia!.id,
      nome: l.barbearia!.nome,
      slug: l.barbearia!.slug,
      papel: l.papel,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const escolhida = (await cookies()).get(COOKIE_BARBEARIA)?.value;
  const atual = vinculos.find((v) => v.barbeariaId === escolhida) ?? vinculos[0] ?? null;

  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { usuario: { id: usuarioId, email }, vinculos, atual };
});
