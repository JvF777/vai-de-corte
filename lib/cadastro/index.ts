import { z } from "zod";
import { lerPreco } from "@/lib/formatos";

/**
 * Regras do cadastro de barbearia feito pelo próprio dono.
 * O banco (RPC criar_barbearia) confere tudo de novo; aqui é para a tela
 * mostrar o erro no campo certo antes de enviar.
 */

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Barbearia do Zé & Filhos" -> "barbearia-do-ze-filhos" */
export function gerarSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Durações oferecidas nos cadastros de serviço: de 10 min a 8 h (limite do banco). */
export const DURACOES: readonly number[] = [
  10, 15, 20, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300, 360, 420, 480,
];

export const MAX_SERVICOS = 30;
export const MAX_BARBEIROS = 20;

const whatsapp = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => /^(55)?\d{10,11}$/.test(v), "Digite o WhatsApp com DDD, como (11) 91234-5678.")
  .transform((v) => (v.length <= 11 ? `55${v}` : v));

export const schemaDadosBarbearia = z.object({
  nome: z.string().trim().min(2, "Digite o nome da barbearia.").max(120, "Use até 120 caracteres."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "O link precisa de pelo menos 3 letras.")
    .max(60, "Use até 60 caracteres.")
    .regex(SLUG, "Use só letras sem acento, números e hífens."),
  whatsapp,
  endereco: z.string().trim().max(300, "Use até 300 caracteres."),
  cidade: z.string().trim().max(100, "Use até 100 caracteres."),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "Use a sigla, como SP."),
});

const schemaServico = z.object({
  nome: z.string().trim().min(2, "Digite o nome do serviço.").max(80, "Use até 80 caracteres."),
  preco: z.string().transform((v, ctx) => {
    const centavos = lerPreco(v);
    if (centavos === null || centavos > 10_000_00) {
      ctx.addIssue({ code: "custom", message: "Digite o preço, como 40,00." });
      return z.NEVER;
    }
    return centavos;
  }),
  duracao: z.coerce.number().int().min(5, "Escolha a duração.").max(480, "Máximo de 8 horas."),
});

const schemaBarbeiro = z.object({
  nome: z.string().trim().min(2, "Digite o nome (pelo menos 2 letras).").max(80, "Use até 80 caracteres."),
  souEu: z.boolean(),
});

export type ServicoCadastro = { nome: string; preco_centavos: number; duracao_minutos: number };
export type BarbeiroCadastro = { nome: string; sou_eu: boolean; servicos?: number[] };

/**
 * Lê as listas de serviços e barbeiros do formulário (campos repetidos com o
 * mesmo nome). Linhas totalmente vazias são ignoradas. Erros voltam como
 * `servico_<campo>_<linha>` e `barbeiro_nome_<linha>`.
 */
export function lerListas(formData: FormData) {
  const campos: Record<string, string> = {};
  const todos = (k: string) => formData.getAll(k).map((v) => String(v));

  const nomesS = todos("servico_nome");
  const precos = todos("servico_preco");
  const duracoes = todos("servico_duracao");
  const servicos: ServicoCadastro[] = [];
  /** Linha do formulário -> posição em `servicos` (linhas vazias ou com erro ficam de fora). */
  const posicaoDaLinha = new Map<number, number>();
  nomesS.forEach((nome, i) => {
    if (!nome.trim() && !(precos[i] ?? "").trim()) return;
    const r = schemaServico.safeParse({ nome, preco: precos[i] ?? "", duracao: duracoes[i] ?? "" });
    if (!r.success) {
      for (const issue of r.error.issues) {
        const chave = `servico_${String(issue.path[0])}_${i}`;
        campos[chave] ??= issue.message;
      }
      return;
    }
    posicaoDaLinha.set(i, servicos.length);
    servicos.push({ nome: r.data.nome, preco_centavos: r.data.preco, duracao_minutos: r.data.duracao });
  });

  const nomesB = todos("barbeiro_nome");
  const souEu = String(formData.get("sou_eu") ?? "");
  // A tela marca quais serviços cada barbeiro faz (campos barbeiro_servicos_<linha>,
  // com a linha do serviço). Sem esse marcador, todos fazem tudo.
  const escolhe = formData.get("escolhe_servicos") === "sim";
  const barbeiros: BarbeiroCadastro[] = [];
  nomesB.forEach((nome, i) => {
    if (!nome.trim()) return;
    const r = schemaBarbeiro.safeParse({ nome, souEu: souEu === String(i) });
    if (!r.success) {
      campos[`barbeiro_nome_${i}`] ??= r.error.issues[0].message;
      return;
    }
    const barbeiro: BarbeiroCadastro = { nome: r.data.nome, sou_eu: r.data.souEu };
    if (escolhe) {
      const marcados = todos(`barbeiro_servicos_${i}`)
        .map((v) => posicaoDaLinha.get(Number(v)))
        .filter((v): v is number => v !== undefined);
      barbeiro.servicos = [...new Set(marcados)].sort((a, b) => a - b);
      if (!barbeiro.servicos.length && servicos.length) {
        campos[`barbeiro_servicos_${i}`] = `Marque pelo menos um serviço que ${r.data.nome} faz.`;
      }
    }
    barbeiros.push(barbeiro);
  });

  if (escolhe && barbeiros.length && !Object.keys(campos).some((c) => c.startsWith("barbeiro_"))) {
    const feitos = new Set(barbeiros.flatMap((b) => b.servicos ?? []));
    const sobra = servicos.filter((_, i) => !feitos.has(i)).map((s) => s.nome);
    if (sobra.length) {
      campos.barbeiros_cobertura = `Ninguém faz ${sobra.join(", ")}. Marque em algum barbeiro ou apague o serviço.`;
    }
  }

  if (!servicos.length && !Object.keys(campos).some((c) => c.startsWith("servico_"))) {
    campos.servicos = "Cadastre pelo menos um serviço.";
  }
  if (servicos.length > MAX_SERVICOS) campos.servicos = `Cadastre até ${MAX_SERVICOS} serviços agora. Dá para pôr mais depois.`;
  if (!barbeiros.length && !Object.keys(campos).some((c) => c.startsWith("barbeiro_"))) {
    campos.barbeiros = "Cadastre pelo menos um barbeiro.";
  }
  if (barbeiros.length > MAX_BARBEIROS) campos.barbeiros = `Cadastre até ${MAX_BARBEIROS} barbeiros agora.`;

  return { servicos, barbeiros, campos };
}

/** Em qual passo do assistente cada campo fica (para voltar ao passo com erro). */
export function passoDoCampo(campo: string): number {
  if (/^(aberto|inicio|fim)_\d$/.test(campo) || campo === "horarios") return 1;
  if (campo.startsWith("servico")) return 2;
  if (campo.startsWith("barbeiro")) return 3;
  return 0;
}
