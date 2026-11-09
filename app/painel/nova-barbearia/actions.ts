"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_BARBEARIA } from "@/lib/auth";
import { lerListas, schemaDadosBarbearia, SLUG } from "@/lib/cadastro";
import { errosDosCampos, textoDoBanco } from "@/lib/painel/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";
import { lerSemana } from "../_componentes/ler-semana";

export type EstadoNovaBarbearia = {
  erro: string | null;
  campos?: Record<string, string>;
  tentativa: number;
};

export type SituacaoLink = "livre" | "ocupado" | "invalido";

/** O link escolhido está livre? Consulta o banco com a sessão do usuário. */
export async function verificarLink(slug: string): Promise<SituacaoLink> {
  const s = String(slug ?? "").trim().toLowerCase();
  if (s.length < 3 || s.length > 60 || !SLUG.test(s)) return "invalido";
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("slug_disponivel", { p_slug: s });
  if (error) return "livre"; // na dúvida não trava a tela; o banco confere de novo ao criar
  return data ? "livre" : "ocupado";
}

export async function criarBarbearia(anterior: EstadoNovaBarbearia, formData: FormData): Promise<EstadoNovaBarbearia> {
  const tentativa = anterior.tentativa + 1;
  const ler = (k: string) => String(formData.get(k) ?? "");

  const dados = schemaDadosBarbearia.safeParse({
    nome: ler("nome"),
    slug: ler("slug"),
    whatsapp: ler("whatsapp"),
    endereco: ler("endereco"),
    cidade: ler("cidade"),
    uf: ler("uf"),
  });
  const semana = lerSemana(formData, false);
  const listas = lerListas(formData);

  const campos: Record<string, string> = {
    ...(dados.success ? {} : errosDosCampos(dados.error)),
    ...(semana.ok ? {} : semana.campos),
    ...listas.campos,
  };
  if (semana.ok && !semana.dias.length) campos.horarios = "Marque pelo menos um dia em que a barbearia abre.";
  if (Object.keys(campos).length || !dados.success || !semana.ok) {
    return { erro: "Confira os campos marcados em vermelho.", campos, tentativa };
  }

  const d = dados.data;
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("criar_barbearia", {
    p_nome: d.nome,
    p_slug: d.slug,
    p_whatsapp: d.whatsapp,
    p_cidade: d.cidade,
    p_uf: d.uf,
    p_endereco: d.endereco,
    p_horarios: semana.dias.map((h) => ({ dia: h.dia, abre: h.inicio, fecha: h.fim })),
    p_servicos: listas.servicos,
    p_barbeiros: listas.barbeiros,
  });

  if (error) {
    const texto = textoDoBanco(error, "Não foi possível criar a barbearia agora. Tente de novo.");
    if (error.message === "SLUG_EM_USO" || error.message === "SLUG_INVALIDO") {
      return { erro: texto, campos: { slug: texto }, tentativa };
    }
    if (error.message !== "LIMITE_BARBEARIAS" && error.message !== "DADOS_INVALIDOS") console.error("criarBarbearia", error);
    return { erro: texto, tentativa };
  }

  const criada = data as { id: string; slug: string };
  // Abre o painel já na barbearia nova (importante para quem tem mais de uma).
  (await cookies()).set(COOKIE_BARBEARIA, criada.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/painel",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/painel?nova=1");
}
