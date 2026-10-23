import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { dataValida, diaDaSemana, paraLocal } from "@/lib/availability";
import { formatarHora, formatarPreco, partesDoDia } from "@/lib/formatos";
import { faixaDoDia, resumirDia } from "@/lib/painel/agenda";
import { carregarAgendaDia, carregarCadastro, obterAcesso } from "@/lib/painel/dados";
import { Aviso } from "@/components/ui/aviso";
import { AgendaDia, type BarbeiroDoDia } from "./_componentes/agenda-dia";

export const metadata: Metadata = { title: "Agenda" };

export default function PaginaAgenda({ searchParams }: PageProps<"/painel/agenda">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Agenda searchParams={searchParams} />
    </Suspense>
  );
}

function Carregando() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando agenda">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="h-9 w-40 rounded-sm bg-elevado" />
          <div className="mt-3 h-5 w-64 max-w-full rounded-sm bg-card" />
        </div>
        <div className="hidden h-11 w-48 rounded-sm bg-elevado sm:block" />
      </div>
      <div className="h-11 w-72 max-w-full rounded-sm bg-card" />
      <div className="h-[32rem] rounded-md border border-borda bg-card" />
    </div>
  );
}

function valor(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function Agenda({ searchParams }: Pick<PageProps<"/painel/agenda">, "searchParams">) {
  const acesso = await obterAcesso();
  if (!acesso) {
    return (
      <Aviso tipo="atencao" titulo="Seu usuário ainda não está ligado a nenhuma barbearia">
        Peça ao responsável pelo Vai de Corte para vincular o seu e-mail a uma barbearia.
      </Aviso>
    );
  }

  const sp = await searchParams;
  const agora = new Date();
  const hoje = paraLocal(agora).data;
  const pedida = valor(sp.data);
  const data = pedida && dataValida(pedida) ? pedida : hoje;

  const barbeariaId = acesso.atual.barbeariaId;
  const [cadastro, agenda] = await Promise.all([carregarCadastro(barbeariaId), carregarAgendaDia(barbeariaId, data)]);

  if (!acesso.ehDono && !acesso.meuBarbeiroId) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-titulo text-titulo font-bold">Agenda</h1>
        <Aviso tipo="atencao" titulo="Seu login ainda não está ligado a um barbeiro">
          Peça ao dono da barbearia para ligar o seu e-mail ao seu cadastro de barbeiro. Depois disso a sua agenda aparece aqui.
        </Aviso>
      </div>
    );
  }

  // Quem aparece: o dono vê os barbeiros ativos (e quem tiver cliente no dia); o barbeiro, só a si mesmo.
  const comAgendamento = new Set(agenda.agendamentos.map((a) => a.barbeiroId));
  const daEquipe = acesso.ehDono
    ? cadastro.barbeiros.filter((b) => b.ativo || comAgendamento.has(b.id))
    : cadastro.barbeiros.filter((b) => b.id === acesso.meuBarbeiroId);
  const filtro = valor(sp.barbeiro);
  const visiveis = acesso.ehDono && filtro && daEquipe.some((b) => b.id === filtro) ? daEquipe.filter((b) => b.id === filtro) : daEquipe;

  const dia = diaDaSemana(data);
  const barbeiros: BarbeiroDoDia[] = visiveis.map((b) => {
    const jornada = b.jornadas.find((j) => j.diaSemana === dia) ?? null;
    return { id: b.id, nome: b.nome, ativo: b.ativo, jornada };
  });
  const ids = new Set(barbeiros.map((b) => b.id));
  const agendamentos = agenda.agendamentos.filter((a) => ids.has(a.barbeiroId));
  const bloqueios = agenda.bloqueios.filter((b) => b.barbeiroId === null || ids.has(b.barbeiroId));

  const faixa = faixaDoDia(
    data,
    cadastro.funcionamento,
    barbeiros.flatMap((b) => (b.jornada ? [b.jornada] : [])),
    agendamentos,
  );
  const resumo = resumirDia(agendamentos, agora);
  const funcionamentoDoDia = cadastro.funcionamento.find((f) => f.diaSemana === dia) ?? null;
  const partes = partesDoDia(data);

  // A frase de cima responde "como está o dia?" antes de qualquer grade.
  const frase = (() => {
    if (!resumo.total) return funcionamentoDoDia ? "Nenhum cliente marcado ainda." : "A barbearia não abre nesse dia.";
    const clientes = resumo.total === 1 ? "1 cliente" : `${resumo.total} clientes`;
    const confirmar = resumo.aConfirmar === 1 ? "1 aguardando confirmação" : `${resumo.aConfirmar} aguardando confirmação`;
    const partesFrase = [`${clientes} na agenda, ${formatarPreco(resumo.receitaPrevistaCentavos)} previstos`];
    if (resumo.aConfirmar) partesFrase.push(confirmar);
    return `${partesFrase.join(". ")}.`;
  })();
  const proximo = resumo.proximo
    ? (() => {
        const a = agendamentos.find((x) => x.inicio === resumo.proximo!.inicio && x.barbeiroId === resumo.proximo!.barbeiroId);
        const quem = barbeiros.length > 1 ? ` com ${barbeiros.find((b) => b.id === resumo.proximo!.barbeiroId)?.nome}` : "";
        return a ? `Próximo: ${formatarHora(a.inicio)}, ${a.cliente.nome.split(" ")[0]} (${a.servico.nome})${quem}.` : null;
      })()
    : null;

  const chips = acesso.ehDono && daEquipe.length > 1;

  return (
    <div className="flex flex-col gap-6">
      <AgendaDia
        data={data}
        hoje={hoje}
        agora={agora.toISOString()}
        titulo={data === hoje ? "Agenda de hoje" : "Agenda"}
        subtitulo={partes.completa}
        frase={frase}
        proximo={data === hoje ? proximo : null}
        faixa={faixa}
        barbeiros={barbeiros}
        agendamentos={agendamentos}
        bloqueios={bloqueios}
        ehDono={acesso.ehDono}
        meuBarbeiroId={acesso.meuBarbeiroId}
        servicos={cadastro.servicos.filter((s) => s.ativo)}
        equipe={cadastro.barbeiros
          .filter((b) => b.ativo && (acesso.ehDono || b.id === acesso.meuBarbeiroId))
          .map((b) => ({ id: b.id, nome: b.nome, servicoIds: b.servicoIds }))}
        abertoNoDia={Boolean(funcionamentoDoDia)}
        funcionamento={cadastro.funcionamento}
        intervalo={cadastro.barbearia.regras.intervaloMinutos}
        barbeiroFiltro={filtro && visiveis.length === 1 ? filtro : null}
        filtros={
          chips
            ? [
                { id: null, rotulo: "Todos", ativo: visiveis.length === daEquipe.length },
                ...daEquipe.map((b) => ({ id: b.id, rotulo: b.nome, ativo: visiveis.length === 1 && visiveis[0].id === b.id })),
              ]
            : []
        }
      />
      {!cadastro.servicos.length && acesso.ehDono && (
        <Aviso tipo="info" titulo="Cadastre seus serviços">
          Sem serviços não dá para agendar.{" "}
          <Link href="/painel/servicos" className="text-ouro-hover underline underline-offset-2">
            Ir para Serviços
          </Link>
        </Aviso>
      )}
    </div>
  );
}
