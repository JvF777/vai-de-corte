"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { lerPreco } from "@/lib/formatos";
import { obterAcesso } from "@/lib/painel/dados";
import { errosDosCampos, type EstadoFormulario } from "@/lib/painel/formulario";
import { criarClienteServidor } from "@/lib/supabase/server";

const SO_DONO = "Só o dono da barbearia pode mudar os serviços.";

const schemaServico = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  nome: z.string().trim().min(2, "Digite o nome do serviço.").max(80, "Use até 80 caracteres."),
  descricao: z.string().trim().max(500, "Use até 500 caracteres."),
  duracao: z.coerce.number().int().min(5, "Mínimo de 5 minutos.").max(480, "Máximo de 8 horas."),
  preco: z
    .string()
    .transform((v, ctx) => {
      const centavos = lerPreco(v);
      if (centavos === null) {
        ctx.addIssue({ code: "custom", message: "Digite o preço, como 40,00." });
        return z.NEVER;
      }
      return centavos;
    })
    .pipe(z.number().max(10_000_00, "Preço muito alto.")),
  ativo: z.boolean(),
  barbeiros: z.array(z.uuid()),
});

export async function salvarServico(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const tentativa = anterior.tentativa + 1;
  const dados = schemaServico.safeParse({
    id: formData.get("id") ?? "",
    nome: formData.get("nome") ?? "",
    descricao: formData.get("descricao") ?? "",
    duracao: formData.get("duracao"),
    preco: formData.get("preco") ?? "",
    ativo: formData.get("ativo") === "sim",
    barbeiros: formData.getAll("barbeiros"),
  });
  if (!dados.success) return { erro: null, campos: errosDosCampos(dados.error), tentativa };
  const d = dados.data;

  const acesso = await obterAcesso();
  if (!acesso?.ehDono) return { erro: SO_DONO, tentativa };
  const barbeariaId = acesso.atual.barbeariaId;
  const supabase = await criarClienteServidor();

  const campos = {
    nome: d.nome,
    descricao: d.descricao || null,
    duracao_minutos: d.duracao,
    preco_centavos: d.preco,
    ativo: d.ativo,
  };

  let servicoId = d.id;
  if (servicoId) {
    const { data, error } = await supabase
      .from("servicos")
      .update(campos)
      .eq("id", servicoId)
      .eq("barbearia_id", barbeariaId)
      .select("id");
    if (error || !data?.length) return { erro: "Não foi possível salvar o serviço. Atualize a página.", tentativa };
  } else {
    const { data: ultimo } = await supabase
      .from("servicos")
      .select("ordem")
      .eq("barbearia_id", barbeariaId)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle<{ ordem: number }>();
    const { data, error } = await supabase
      .from("servicos")
      .insert({ ...campos, barbearia_id: barbeariaId, ordem: (ultimo?.ordem ?? 0) + 1 })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) return { erro: "Não foi possível criar o serviço. Tente de novo.", tentativa };
    servicoId = data.id;
  }

  // Quem faz o serviço: tira quem saiu e põe quem entrou.
  const { data: atuais, error: erroAtuais } = await supabase
    .from("barbeiro_servicos")
    .select("barbeiro_id")
    .eq("servico_id", servicoId)
    .returns<{ barbeiro_id: string }[]>();
  if (erroAtuais) return { erro: "Serviço salvo, mas não deu para atualizar os barbeiros. Tente de novo.", tentativa };
  const antes = new Set((atuais ?? []).map((l) => l.barbeiro_id));
  const depois = new Set(d.barbeiros);
  const sair = [...antes].filter((id) => !depois.has(id));
  const entrar = [...depois].filter((id) => !antes.has(id));
  if (sair.length) {
    const { error } = await supabase.from("barbeiro_servicos").delete().eq("servico_id", servicoId).in("barbeiro_id", sair);
    if (error) return { erro: "Serviço salvo, mas não deu para atualizar os barbeiros. Tente de novo.", tentativa };
  }
  if (entrar.length) {
    const { error } = await supabase
      .from("barbeiro_servicos")
      .insert(entrar.map((barbeiroId) => ({ barbearia_id: barbeariaId, barbeiro_id: barbeiroId, servico_id: servicoId })));
    if (error) return { erro: "Serviço salvo, mas não deu para atualizar os barbeiros. Tente de novo.", tentativa };
  }

  refresh();
  return { erro: null, ok: true, tentativa };
}

export async function excluirServico(id: string): Promise<{ erro: string | null }> {
  if (!z.uuid().safeParse(id).success) return { erro: "Serviço inválido." };
  const acesso = await obterAcesso();
  if (!acesso?.ehDono) return { erro: SO_DONO };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("servicos")
    .delete()
    .eq("id", id)
    .eq("barbearia_id", acesso.atual.barbeariaId)
    .select("id");
  if (error?.code === "23503") {
    return { erro: "Esse serviço já tem agendamentos e fica no histórico. Desmarque \"Aparece no link\" para escondê-lo." };
  }
  if (error || !data?.length) return { erro: "Não foi possível excluir. Atualize a página." };
  refresh();
  return { erro: null };
}
