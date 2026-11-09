import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { paraLocal, somarDias } from "@/lib/availability";
import { formatarHora, formatarPreco, partesDoDia } from "@/lib/formatos";
import { carregarGanhos } from "@/lib/painel/dados-ganhos";
import { carregarCadastro, obterAcesso, type BarbeiroPainel } from "@/lib/painel/dados";
import {
  diasDoPeriodo,
  escalaDoGrafico,
  lerPeriodo,
  limitesDoPeriodo,
  resumirGanhos,
  type AgendamentoGanho,
  type Ganhos,
  type Periodo,
  urlGanhos,
} from "@/lib/painel/ganhos";
import { Contador } from "@/components/animacao/contador";
import { Crescer } from "@/components/animacao/crescer";
import { Revelar } from "@/components/animacao/revelar";
import { Avatar } from "@/components/ui/avatar";
import { Aviso } from "@/components/ui/aviso";
import { Painel } from "@/components/ui/painel";
import { SeloStatus } from "@/components/ui/selo-status";
import { NavegacaoPeriodo } from "./_componentes/navegacao-periodo";

export const metadata: Metadata = { title: "Ganhos" };

export default function PaginaGanhos({ searchParams }: PageProps<"/painel/ganhos">) {
  return (
    <Suspense fallback={<Carregando />}>
      <TelaGanhos searchParams={searchParams} />
    </Suspense>
  );
}

function Carregando() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando ganhos">
      <div>
        <div className="h-9 w-40 rounded-sm bg-elevado" />
        <div className="mt-3 h-5 w-64 max-w-full rounded-sm bg-card" />
      </div>
      <div className="h-11 w-96 max-w-full rounded-sm bg-card" />
      <div className="h-40 rounded-md border border-borda bg-card" />
      <div className="h-72 rounded-md border border-borda bg-card" />
    </div>
  );
}

function valor(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** "R$ 1.250" (sem centavos) para os eixos do gráfico. */
const reaisCurtos = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

async function TelaGanhos({ searchParams }: Pick<PageProps<"/painel/ganhos">, "searchParams">) {
  const acesso = await obterAcesso();
  if (!acesso) {
    return (
      <Aviso tipo="atencao" titulo="Seu usuário ainda não está ligado a nenhuma barbearia">
        Peça ao responsável pelo Vai de Corte para vincular o seu e-mail a uma barbearia.
      </Aviso>
    );
  }
  if (!acesso.ehDono && !acesso.meuBarbeiroId) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-titulo text-titulo font-bold">Ganhos</h1>
        <Aviso tipo="atencao" titulo="Seu login ainda não está ligado a um barbeiro">
          Peça ao dono da barbearia para ligar o seu e-mail ao seu cadastro de barbeiro. Depois disso os seus números aparecem aqui.
        </Aviso>
      </div>
    );
  }

  const sp = await searchParams;
  const agora = new Date();
  const hoje = paraLocal(agora).data;
  const { periodo, data } = lerPeriodo(valor(sp.periodo), valor(sp.data), hoje);
  const barbeariaId = acesso.atual.barbeariaId;
  const cadastro = await carregarCadastro(barbeariaId);

  // O barbeiro vê só os próprios números; o dono vê todos ou escolhe um barbeiro.
  const pedido = valor(sp.barbeiro);
  const filtro = acesso.ehDono
    ? (cadastro.barbeiros.find((b) => b.id === pedido)?.id ?? null)
    : acesso.meuBarbeiroId;
  const { de, ate } = limitesDoPeriodo(periodo, data);
  const itens = await carregarGanhos(barbeariaId, de, ate, filtro);
  const g = resumirGanhos(itens, agora);

  const nomes = new Map(cadastro.barbeiros.map((b) => [b.id, b.nome]));
  const comNumeros = new Set(itens.map((a) => a.barbeiroId));
  const equipe = cadastro.barbeiros.filter((b) => b.ativo || comNumeros.has(b.id));
  const visaoDaEquipe = acesso.ehDono && !filtro;
  const mostrarBarbeiro = visaoDaEquipe && equipe.length > 1;

  const partes = partesDoDia(data);
  const nomeMes = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${data}T12:00:00Z`));
  const subtitulo = periodo === "mes" ? nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) : partes.completa;

  const quem = visaoDaEquipe ? "a barbearia" : filtro && acesso.ehDono ? (nomes.get(filtro) ?? "o barbeiro") : "você";
  const frase = fraseDoPeriodo({ periodo, data, hoje, quem, g, nomeMes });

  // Primeiro dia com atendimento que passou do horário sem ninguém marcar: é onde o barbeiro precisa ir.
  const pendente = itens.find(
    (a) => (a.status === "agendado" || a.status === "confirmado") && new Date(a.inicio).getTime() <= agora.getTime(),
  );

  const chips = acesso.ehDono && equipe.length > 1;

  return (
    <Revelar className="flex flex-col gap-6">
      <header className="flex flex-col gap-4" data-anima>
        <div>
          <h1 className="font-titulo text-[1.625rem] font-bold leading-tight tracking-[-0.02em] sm:text-titulo">Ganhos</h1>
          <p className="mt-1 text-texto-sec first-letter:uppercase">{subtitulo}</p>
        </div>
        <NavegacaoPeriodo periodo={periodo} data={data} hoje={hoje} barbeiro={acesso.ehDono ? filtro : null} />
        {chips && (
          <nav aria-label="Ver por barbeiro" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex w-max gap-2">
              {[{ id: null, nome: "Todos" }, ...equipe].map((b) => {
                const ativo = b.id === filtro;
                return (
                  <li key={b.id ?? "todos"}>
                    <Link
                      href={urlGanhos(periodo, data, b.id)}
                      aria-current={ativo ? "true" : undefined}
                      className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-base transition-colors ${
                        ativo ? "border-ouro bg-ouro/10 text-texto" : "border-borda text-texto-sec hover:border-borda-forte hover:text-texto"
                      }`}
                    >
                      {b.nome}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>

      <p className="text-subtitulo text-texto" aria-live="polite" data-anima>
        {frase}
      </p>

      <Destaque g={g} periodo={periodo} />

      {pendente && g.semMarcar > 0 && (
        <div data-anima>
          <Aviso tipo="atencao" titulo={`${plural(g.semMarcar, "cliente ficou", "clientes ficaram")} sem marcar (${formatarPreco(g.semMarcarCentavos)})`}>
            O horário já passou e ninguém marcou se o cliente veio. Marque como concluído ou falta para o valor entrar na conta.{" "}
            <Link
              href={`/painel/agenda?data=${paraLocal(new Date(pendente.inicio)).data}${filtro && acesso.ehDono ? `&barbeiro=${filtro}` : ""}`}
              className="whitespace-nowrap text-ouro-hover underline underline-offset-2"
            >
              Abrir a agenda{periodo === "mes" ? ` de ${partesDoDia(paraLocal(new Date(pendente.inicio)).data).dia}/${data.slice(5, 7)}` : ""}
            </Link>
          </Aviso>
        </div>
      )}

      {periodo === "mes" && <GraficoMes data={data} hoje={hoje} g={g} />}

      <div className={`grid items-start gap-6 ${periodo === "dia" ? "xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : "lg:grid-cols-2"}`}>
        {periodo === "dia" && <Atendimentos itens={itens} nomes={mostrarBarbeiro ? nomes : null} />}
        <div className={periodo === "dia" ? "flex flex-col gap-6" : "contents"}>
          <Servicos g={g} periodo={periodo} />
          {mostrarBarbeiro && <PorBarbeiro g={g} equipe={equipe} periodo={periodo} data={data} />}
        </div>
      </div>
    </Revelar>
  );
}

function fraseDoPeriodo({
  periodo,
  data,
  hoje,
  quem,
  g,
  nomeMes,
}: {
  periodo: Periodo;
  data: string;
  hoje: string;
  quem: string;
  g: Ganhos;
  nomeMes: string;
}) {
  const quando =
    periodo === "mes"
      ? data.slice(0, 7) === hoje.slice(0, 7)
        ? "Neste mês"
        : `Em ${nomeMes}`
      : data === hoje
        ? "Hoje"
        : data === somarDias(hoje, -1)
          ? "Ontem"
          : `${partesDoDia(data).semanaLonga.replace(/^./, (c) => c.toUpperCase())}, dia ${partesDoDia(data).dia}`;
  const marcados = g.naAgenda ? `${plural(g.naAgenda, "cliente marcado", "clientes marcados")}, ${formatarPreco(g.naAgendaCentavos)} previstos.` : "";

  if (g.atendidos) {
    const frase = `${quando} ${quem} atendeu ${plural(g.atendidos, "cliente", "clientes")} e faturou ${formatarPreco(g.faturadoCentavos)}.`;
    return g.naAgenda ? `${frase} Ainda tem ${marcados.charAt(0).toLowerCase()}${marcados.slice(1)}` : frase;
  }
  if (g.naAgenda) return `${quando}: ${marcados}`;
  if (g.semMarcar) return `${quando}: nenhum atendimento marcado como concluído ainda.`;
  return periodo === "mes" ? `${quando}: nenhum atendimento ainda.` : `${quando}: nenhum cliente.`;
}

/** O número que responde a pergunta da tela (quanto entrou) e, ao lado, os números do dia a dia. */
function Destaque({ g, periodo }: { g: Ganhos; periodo: Periodo }) {
  const itens = [
    { rotulo: "Clientes atendidos", valor: <Contador valor={g.atendidos} />, nota: null },
    {
      rotulo: "Ticket médio",
      valor: g.ticketMedioCentavos === null ? <span className="text-texto-disc">—</span> : <span className="numeros">{formatarPreco(g.ticketMedioCentavos)}</span>,
      nota: null,
    },
    {
      rotulo: "Faltas",
      valor: <Contador valor={g.faltas} />,
      nota: g.faltas ? `${formatarPreco(g.faltasCentavos)} não entraram` : null,
    },
    { rotulo: "Cancelados", valor: <Contador valor={g.cancelados} />, nota: null },
  ];

  return (
    <Painel data-anima aria-labelledby="titulo-faturado" className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col justify-center gap-1 border-b border-borda px-5 py-6 sm:px-6 lg:border-r lg:border-b-0">
        <h2 id="titulo-faturado" className="font-sans text-label font-medium text-texto-sec">
          Faturado {periodo === "mes" ? "no mês" : "no dia"}
        </h2>
        <p className="font-titulo text-[2.25rem] font-bold leading-[1.05] tracking-[-0.02em] text-ouro-hover sm:text-[2.5rem]">
          <Contador valor={g.faturadoCentavos} centavos />
        </p>
        <p className="mt-1 text-texto-sec">
          {g.naAgenda
            ? `+ ${formatarPreco(g.naAgendaCentavos)} com ${plural(g.naAgenda, "cliente", "clientes")} na agenda`
            : "Soma dos atendimentos concluídos"}
        </p>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2">
        {itens.map(({ rotulo, valor: v, nota }, i) => (
          <div
            key={rotulo}
            className={`flex flex-col gap-1 px-5 py-4 sm:px-6 sm:py-5 ${i % 2 ? "border-l border-borda" : ""} ${
              i >= 2 ? "border-t border-borda sm:border-t-0 lg:border-t" : ""
            } ${i === 2 ? "sm:border-l lg:border-l-0" : ""}`}
          >
            <dt className="text-label font-medium text-texto-sec">{rotulo}</dt>
            <dd className="font-titulo text-[1.5rem] font-semibold leading-tight">{v}</dd>
            {nota && <dd className="text-label text-texto-disc">{nota}</dd>}
          </div>
        ))}
      </dl>
    </Painel>
  );
}

/** Faturado de cada dia do mês: colunas douradas, hoje com a data em destaque, dias que ainda vão chegar vazios. */
function GraficoMes({ data, hoje, g }: { data: string; hoje: string; g: Ganhos }) {
  const dias = diasDoPeriodo("mes", data);
  const valores = dias.map((d) => g.porDia[d] ?? 0);
  const max = Math.max(0, ...valores);
  const { topo, marcas } = escalaDoGrafico(max);
  const melhor = max > 0 ? dias[valores.indexOf(max)] : null;
  // Um rótulo por semana (1, 8, 15...) e o de hoje; o da semana sai quando encostaria no de hoje.
  const colado = (d: string) => d !== hoje && d.slice(0, 7) === hoje.slice(0, 7) && Math.abs(Number(d.slice(8)) - Number(hoje.slice(8))) < 3;
  const rotulos = new Set(dias.filter((d, i) => i % 7 === 0 && !colado(d)));

  return (
    <Painel data-anima aria-labelledby="titulo-grafico" className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 id="titulo-grafico" className="font-titulo text-subtitulo font-semibold">
          Faturado por dia
        </h2>
        {melhor && (
          <p className="text-texto-sec">
            Melhor dia: {partesDoDia(melhor).semana}, {partesDoDia(melhor).dia} ({formatarPreco(max)})
          </p>
        )}
      </div>

      <Crescer className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2">
        {/* Eixo: 5 marcas redondas, a de cima acima do melhor dia. */}
        <div className="relative h-44 sm:h-52" aria-hidden>
          {marcas.map((m) => (
            <span
              key={m}
              className="numeros absolute right-0 -translate-y-1/2 text-[0.75rem] text-texto-disc"
              style={{ top: `${(1 - m / topo) * 100}%` }}
            >
              {reaisCurtos.format(m / 100)}
            </span>
          ))}
        </div>
        <div className="relative h-44 sm:h-52">
          {marcas.map((m) => (
            <div
              key={m}
              aria-hidden
              className={`absolute inset-x-0 border-t ${m === 0 ? "border-borda-forte" : "border-borda/70"}`}
              style={{ top: `${(1 - m / topo) * 100}%` }}
            />
          ))}
          <ol className="absolute inset-0 flex items-end gap-[3px] sm:gap-1.5">
            {dias.map((d, i) => {
              const v = valores[i];
              const futuro = d > hoje;
              return (
                <li key={d} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${partesDoDia(d).dia}/${d.slice(5, 7)}: ${formatarPreco(v)}`}>
                  <span className="sr-only">
                    Dia {partesDoDia(d).dia}: {futuro ? "ainda não chegou" : formatarPreco(v)}
                  </span>
                  {v > 0 && (
                    <div
                      data-cresce="y"
                      className={`w-full rounded-t-[3px] transition-colors ${d === hoje ? "bg-ouro-hover" : "bg-ouro group-hover:bg-ouro-hover"}`}
                      style={{ height: `${(v / topo) * 100}%` }}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <div />
        <div className="flex gap-[3px] pt-2 sm:gap-1.5" aria-hidden>
          {dias.map((d) => (
            <span
              key={d}
              className={`numeros min-w-0 flex-1 text-center text-[0.75rem] ${d === hoje ? "font-semibold text-texto" : "text-texto-disc"}`}
            >
              {rotulos.has(d) || d === hoje ? Number(d.slice(8)) : ""}
            </span>
          ))}
        </div>
      </Crescer>
    </Painel>
  );
}

/** Os clientes do dia, na ordem do horário, com o valor de cada um. */
function Atendimentos({ itens, nomes }: { itens: AgendamentoGanho[]; nomes: Map<string, string> | null }) {
  return (
    <Painel data-anima aria-labelledby="titulo-atendimentos">
      <div className="flex items-baseline justify-between gap-3 border-b border-borda px-5 py-4 sm:px-6">
        <h2 id="titulo-atendimentos" className="font-titulo text-subtitulo font-semibold">
          Clientes do dia
        </h2>
        <p className="text-label text-texto-sec">{plural(itens.length, "agendamento", "agendamentos")}</p>
      </div>
      {itens.length === 0 ? (
        <p className="px-5 py-8 text-texto-sec sm:px-6">Nenhum cliente marcado neste dia.</p>
      ) : (
        <ul className="divide-y divide-borda">
          {itens.map((a) => {
            const entrou = a.status === "concluido";
            const perdido = a.status === "falta" || a.status === "cancelado";
            return (
              <li key={a.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-3 sm:px-6">
                <span className="numeros text-texto-sec">{formatarHora(a.inicio)}</span>
                <div className="min-w-0">
                  <p className="truncate text-texto">{a.clienteNome}</p>
                  <p className="truncate text-label text-texto-sec">
                    {a.servico.nome}
                    {nomes ? ` · ${nomes.get(a.barbeiroId) ?? ""}` : ""}
                  </p>
                  {/* Celular estreito: o selo fica embaixo do nome, para o nome caber. */}
                  {!entrou && (
                    <div className="mt-1.5 min-[400px]:hidden">
                      <SeloStatus valor={a.status} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`numeros ${entrou ? "font-semibold text-texto" : perdido ? "text-texto-disc line-through" : "text-texto-sec"}`}>
                    {formatarPreco(a.precoCentavos)}
                  </span>
                  {!entrou && (
                    <span className="max-[399px]:hidden">
                      <SeloStatus valor={a.status} />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}

/** Serviços concluídos, do mais feito ao menos feito; a faixa dourada atrás é a quantidade. */
function Servicos({ g, periodo }: { g: Ganhos; periodo: Periodo }) {
  const max = g.porServico[0]?.quantidade ?? 0;
  return (
    <Painel data-anima aria-labelledby="titulo-servicos">
      <h2 id="titulo-servicos" className="border-b border-borda px-5 py-4 font-titulo text-subtitulo font-semibold sm:px-6">
        Serviços mais feitos
      </h2>
      {g.porServico.length === 0 ? (
        <p className="px-5 py-8 text-texto-sec sm:px-6">Nenhum serviço concluído {periodo === "mes" ? "neste mês" : "neste dia"}.</p>
      ) : (
        <Crescer>
          <ol className="flex flex-col gap-1.5 p-3">
            {g.porServico.map((s) => (
              <li key={s.id} className="relative overflow-hidden rounded-sm">
                <div
                  data-cresce="x"
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-ouro/12"
                  style={{ width: `${(s.quantidade / max) * 100}%` }}
                />
                <div className="relative grid min-h-11 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3">
                  <span className="truncate text-texto">{s.nome}</span>
                  <span className="numeros text-texto-sec">{s.quantidade}×</span>
                  <span className="numeros w-24 text-right text-texto">{formatarPreco(s.faturadoCentavos)}</span>
                </div>
              </li>
            ))}
          </ol>
        </Crescer>
      )}
    </Painel>
  );
}

/** Para o dono: quanto cada barbeiro fez. Tocar no nome mostra só os números dele. */
function PorBarbeiro({ g, equipe, periodo, data }: { g: Ganhos; equipe: BarbeiroPainel[]; periodo: Periodo; data: string }) {
  const linhas = equipe
    .map((b) => ({ b, n: g.porBarbeiro.find((x) => x.barbeiroId === b.id) ?? { atendidos: 0, faturadoCentavos: 0, faltas: 0, naAgenda: 0 } }))
    .sort((x, y) => y.n.faturadoCentavos - x.n.faturadoCentavos || y.n.atendidos - x.n.atendidos || x.b.nome.localeCompare(y.b.nome, "pt-BR"));

  return (
    <Painel data-anima aria-labelledby="titulo-barbeiros">
      <h2 id="titulo-barbeiros" className="border-b border-borda px-5 py-4 font-titulo text-subtitulo font-semibold sm:px-6">
        Por barbeiro
      </h2>
      <ul className="divide-y divide-borda">
        {linhas.map(({ b, n }) => (
          <li key={b.id}>
            <Link
              href={urlGanhos(periodo, data, b.id)}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-elevado sm:px-6"
            >
              <Avatar nome={b.nome} url={b.fotoUrl} />
              <div className="min-w-0">
                <p className="truncate text-texto">{b.nome}</p>
                <p className="truncate text-label text-texto-sec">
                  {plural(n.atendidos, "atendido", "atendidos")}
                  {n.faltas ? ` · ${plural(n.faltas, "falta", "faltas")}` : ""}
                  {n.naAgenda ? ` · ${n.naAgenda} na agenda` : ""}
                </p>
              </div>
              <span className={`numeros ${n.faturadoCentavos ? "font-semibold text-texto" : "text-texto-disc"}`}>{formatarPreco(n.faturadoCentavos)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Painel>
  );
}
