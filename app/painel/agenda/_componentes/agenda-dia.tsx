"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Painel } from "@/components/ui/painel";
import { SeloStatus } from "@/components/ui/selo-status";
import { horaParaMinutos, instanteLocal, minutosParaHora, paraLocal, type Jornada } from "@/lib/availability";
import { formatarHora } from "@/lib/formatos";
import { posicaoNaFaixa, STATUS_ATIVOS, type Faixa, type Status } from "@/lib/painel/agenda";
import type { AgendamentoPainel, BloqueioPainel, ServicoPainel } from "@/lib/painel/dados";
import { horaCurta } from "@/app/barbearia/[slug]/_componentes/funcionamento";
import { BloquearHorario } from "./bloquear-horario";
import { DetalheAgendamento } from "./detalhe-agendamento";
import { DetalheBloqueio } from "./detalhe-bloqueio";
import { NavegacaoDia } from "./navegacao-dia";
import { NovoAgendamento, type MembroEquipe } from "./novo-agendamento";

export type BarbeiroDoDia = { id: string; nome: string; ativo: boolean; jornada: Jornada | null };

type Props = {
  data: string;
  hoje: string;
  agora: string;
  titulo: string;
  subtitulo: string;
  frase: string;
  proximo: string | null;
  faixa: Faixa;
  barbeiros: BarbeiroDoDia[];
  agendamentos: AgendamentoPainel[];
  bloqueios: BloqueioPainel[];
  ehDono: boolean;
  meuBarbeiroId: string | null;
  servicos: ServicoPainel[];
  equipe: MembroEquipe[];
  abertoNoDia: boolean;
  barbeiroFiltro: string | null;
  /** Atalhos por barbeiro (só para o dono com mais de um barbeiro). id nulo = todos. */
  filtros: { id: string | null; rotulo: string; ativo: boolean }[];
};

/** Pixels por minuto na grade do desktop: 30 min = 48 px, cabem nome e serviço. */
const PX = 1.6;

/** Faixa lateral colorida de cada status (a cor nunca vem sozinha: o texto do status vai junto). */
const BORDA_STATUS: Record<Status, string> = {
  agendado: "border-l-info",
  confirmado: "border-l-ouro",
  concluido: "border-l-sucesso",
  cancelado: "border-l-borda-forte",
  falta: "border-l-erro",
};

const ROTULO_STATUS: Record<Status, string> = {
  agendado: "a confirmar",
  confirmado: "confirmado",
  concluido: "concluído",
  cancelado: "cancelado",
  falta: "faltou",
};

/** Hachura discreta para almoço e bloqueios (padrão, não decoração). */
const HACHURA: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(135deg, var(--color-borda) 0 1px, transparent 1px 9px)",
};

type Abertura = { barbeiroId?: string; hora?: string } | null;

export function AgendaDia(props: Props) {
  const { data, barbeiros, agendamentos, bloqueios, ehDono, meuBarbeiroId } = props;
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [bloqueioAberto, setBloqueioAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState<Abertura>(null);
  const [bloquear, setBloquear] = useState<Abertura>(null);

  const ativos = agendamentos.filter((a) => STATUS_ATIVOS.includes(a.status));
  const encerrados = agendamentos.filter((a) => !STATUS_ATIVOS.includes(a.status));
  const nomeBarbeiro = (id: string | null) => (id ? (barbeiros.find((b) => b.id === id)?.nome ?? "Barbeiro") : "Barbearia inteira");
  const agendamento = agendamentos.find((a) => a.id === detalhe) ?? null;
  const bloqueio = bloqueios.find((b) => b.id === bloqueioAberto) ?? null;
  const podeAgendar = props.servicos.length > 0 && props.equipe.length > 0;

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-titulo text-[1.625rem] font-bold leading-tight tracking-[-0.02em] sm:text-titulo">{props.titulo}</h1>
          <p className="mt-1 text-subtitulo text-texto-sec first-letter:uppercase">{props.subtitulo}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Botao variante="secundario" icone={<Lock aria-hidden />} onClick={() => setBloquear({})}>
            <span className="sm:hidden">Bloquear</span>
            <span className="hidden sm:inline">Bloquear horário</span>
          </Botao>
          <Botao icone={<Plus aria-hidden />} onClick={() => setNovo({})} disabled={!podeAgendar}>
            <span className="sm:hidden">Agendar</span>
            <span className="hidden sm:inline">Novo agendamento</span>
          </Botao>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <NavegacaoDia data={data} hoje={props.hoje} barbeiro={props.barbeiroFiltro} />
        {props.filtros.length > 0 && (
          <nav aria-label="Filtrar por barbeiro" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex w-max gap-2">
              {props.filtros.map((f) => (
                <li key={f.id ?? "todos"}>
                  <Link
                    href={`/painel/agenda?data=${data}${f.id ? `&barbeiro=${f.id}` : ""}`}
                    aria-current={f.ativo ? "true" : undefined}
                    className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-base transition-colors ${
                      f.ativo ? "border-ouro bg-ouro/10 text-texto" : "border-borda text-texto-sec hover:border-borda-forte hover:text-texto"
                    }`}
                  >
                    {f.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <div aria-live="polite">
        <p className="text-subtitulo text-texto">{props.frase}</p>
        {props.proximo && <p className="mt-0.5 text-texto-sec">{props.proximo}</p>}
      </div>

      {barbeiros.length === 0 ? (
        <Painel className="px-5 py-10 text-center text-texto-sec">Nenhum barbeiro ativo. Cadastre a equipe em Barbeiros.</Painel>
      ) : (
        <>
          <Grade
            {...props}
            ativos={ativos}
            aoAbrirAgendamento={setDetalhe}
            aoAbrirBloqueio={setBloqueioAberto}
            aoClicarHorario={(barbeiroId, hora) => podeAgendar && setNovo({ barbeiroId, hora })}
          />
          <Lista {...props} ativos={ativos} aoAbrirAgendamento={setDetalhe} aoAbrirBloqueio={setBloqueioAberto} />
        </>
      )}

      {encerrados.length > 0 && (
        <Painel aria-labelledby="titulo-encerrados">
          <h2 id="titulo-encerrados" className="border-b border-borda px-5 py-4 font-titulo text-subtitulo font-semibold">
            Cancelados e faltas
          </h2>
          <ul className="divide-y divide-borda">
            {encerrados.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setDetalhe(a.id)}
                  className="grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-elevado"
                >
                  <span className="numeros text-texto-sec">{formatarHora(a.inicio)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-texto">{a.cliente.nome}</span>
                    <span className="block truncate text-label text-texto-sec">
                      {a.servico.nome}
                      {barbeiros.length > 1 ? `, com ${nomeBarbeiro(a.barbeiroId)}` : ""}
                    </span>
                  </span>
                  <SeloStatus valor={a.status} />
                </button>
              </li>
            ))}
          </ul>
        </Painel>
      )}

      <DetalheAgendamento
        agendamento={agendamento}
        nomeBarbeiro={agendamento ? nomeBarbeiro(agendamento.barbeiroId) : ""}
        agora={props.agora}
        aoFechar={() => setDetalhe(null)}
      />
      <DetalheBloqueio
        bloqueio={bloqueio}
        nomeBarbeiro={bloqueio ? nomeBarbeiro(bloqueio.barbeiroId) : ""}
        podeLiberar={Boolean(bloqueio && (ehDono || (bloqueio.barbeiroId !== null && bloqueio.barbeiroId === meuBarbeiroId)))}
        aoFechar={() => setBloqueioAberto(null)}
      />
      <NovoAgendamento
        aberto={novo !== null}
        aoFechar={() => setNovo(null)}
        data={data}
        hoje={props.hoje}
        barbeiroInicial={novo?.barbeiroId}
        horaPreferida={novo?.hora}
        servicos={props.servicos}
        equipe={props.equipe}
        barbeiroFixo={!ehDono}
      />
      <BloquearHorario
        aberto={bloquear !== null}
        aoFechar={() => setBloquear(null)}
        data={data}
        hoje={props.hoje}
        barbeiroInicial={bloquear?.barbeiroId ?? (ehDono ? "" : (meuBarbeiroId ?? ""))}
        equipe={props.equipe}
        podeBarbeariaInteira={ehDono}
      />
    </>
  );
}

type PropsVisao = Props & {
  ativos: AgendamentoPainel[];
  aoAbrirAgendamento: (id: string) => void;
  aoAbrirBloqueio: (id: string) => void;
};

function textoJornada(j: Jornada | null) {
  if (!j) return "Folga neste dia";
  const almoco = j.almocoInicio && j.almocoFim ? `, almoço ${horaCurta(j.almocoInicio)} às ${horaCurta(j.almocoFim)}` : "";
  return `${horaCurta(j.inicio)} às ${horaCurta(j.fim)}${almoco}`;
}

/** Grade do desktop: horas na vertical, uma coluna por barbeiro. */
function Grade({
  data,
  hoje,
  agora,
  faixa,
  barbeiros,
  ativos,
  bloqueios,
  aoAbrirAgendamento,
  aoAbrirBloqueio,
  aoClicarHorario,
}: PropsVisao & { aoClicarHorario: (barbeiroId: string, hora: string) => void }) {
  const altura = (faixa.fim - faixa.inicio) * PX;
  const horas: number[] = [];
  for (let m = faixa.inicio; m <= faixa.fim; m += 60) horas.push(m);
  const colunas = { gridTemplateColumns: `3.5rem repeat(${barbeiros.length}, minmax(12rem, 1fr))` };

  const agoraLocal = paraLocal(new Date(agora));
  const linhaAgora =
    data === hoje && agoraLocal.minutos >= faixa.inicio && agoraLocal.minutos <= faixa.fim
      ? (agoraLocal.minutos - faixa.inicio) * PX
      : null;

  return (
    <div className="hidden overflow-x-auto rounded-md border border-borda bg-card lg:block">
      <div className="min-w-fit">
        <div className="sticky top-0 z-10 grid border-b border-borda bg-card" style={colunas}>
          <div />
          {barbeiros.map((b) => (
            <div key={b.id} className="border-l border-borda px-3 py-3">
              <p className="truncate font-medium">
                {b.nome}
                {!b.ativo && <span className="ml-2 text-label font-normal text-texto-disc">desativado</span>}
              </p>
              <p className="text-label text-texto-sec">{textoJornada(b.jornada)}</p>
            </div>
          ))}
        </div>

        <div className="grid" style={colunas}>
          <div className="py-3">
            <div className="relative" style={{ height: altura }} aria-hidden>
              {horas.map((m) => (
                <span key={m} className="numeros absolute right-2 -translate-y-1/2 text-label text-texto-disc" style={{ top: (m - faixa.inicio) * PX }}>
                  {minutosParaHora(m)}
                </span>
              ))}
              {linhaAgora !== null && (
                <span
                  className="numeros absolute right-1 z-20 -translate-y-1/2 rounded-sm bg-ouro px-1 text-[0.75rem] font-semibold text-sobre-ouro"
                  style={{ top: linhaAgora }}
                >
                  {minutosParaHora(agoraLocal.minutos)}
                </span>
              )}
            </div>
          </div>

          {barbeiros.map((b) => {
            const j = b.jornada;
            const trabalho = j ? posicaoMinutos(faixa, horaParaMinutos(j.inicio), horaParaMinutos(j.fim)) : null;
            const almoco =
              j?.almocoInicio && j.almocoFim ? posicaoMinutos(faixa, horaParaMinutos(j.almocoInicio), horaParaMinutos(j.almocoFim)) : null;
            const doBarbeiro = ativos.filter((a) => a.barbeiroId === b.id);
            const bloqueiosDele = bloqueios.filter((x) => x.barbeiroId === null || x.barbeiroId === b.id);

            return (
              <div key={b.id} className="border-l border-borda py-3">
                <div
                  className="relative cursor-pointer bg-fundo"
                  style={{ height: altura }}
                  title="Clique num horário vazio para agendar"
                  onClick={(e) => {
                    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.fundo) return;
                    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                    const minuto = faixa.inicio + Math.floor(y / PX / 30) * 30;
                    aoClicarHorario(b.id, minutosParaHora(minuto));
                  }}
                >
                  {trabalho && <div data-fundo="1" className="absolute inset-x-0 bg-card" style={{ top: trabalho.topo, height: trabalho.altura }} />}
                  {horas.map((m) => (
                    <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-borda" style={{ top: (m - faixa.inicio) * PX }} />
                  ))}
                  {horas.slice(0, -1).map((m) => (
                    <div
                      key={`meia-${m}`}
                      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-borda/50"
                      style={{ top: (m + 30 - faixa.inicio) * PX }}
                    />
                  ))}
                  {!j && (
                    <p className="pointer-events-none absolute inset-x-0 top-4 text-center text-label text-texto-disc">Folga</p>
                  )}
                  {almoco && (
                    <div
                      className="pointer-events-none absolute inset-x-0 flex items-start px-3 pt-1.5 text-label text-texto-disc"
                      style={{ top: almoco.topo, height: almoco.altura, ...HACHURA }}
                    >
                      Almoço
                    </div>
                  )}

                  {bloqueiosDele.map((x) => {
                    const pos = posicaoNaFaixa(data, faixa, x.inicio, x.fim);
                    if (!pos) return null;
                    return (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => aoAbrirBloqueio(x.id)}
                        className="absolute inset-x-1.5 flex flex-col justify-start overflow-hidden rounded-sm border border-dashed border-borda-forte bg-superficie px-2.5 py-1 text-left text-label text-texto-sec transition-colors hover:border-texto-disc"
                        style={{ top: pos.topo * PX, height: pos.altura * PX, ...HACHURA }}
                      >
                        <span className="font-medium text-texto">{x.tipo === "bloqueio" ? "Bloqueado" : x.tipo === "folga" ? "Folga" : "Fechado"}</span>
                        {x.motivo && <span className="block truncate">{x.motivo}</span>}
                      </button>
                    );
                  })}

                  {doBarbeiro.map((a) => {
                    const pos = posicaoNaFaixa(data, faixa, a.inicio, a.fim);
                    if (!pos) return null;
                    const alturaPx = pos.altura * PX;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => aoAbrirAgendamento(a.id)}
                        aria-label={`${formatarHora(a.inicio)}, ${a.cliente.nome}, ${a.servico.nome}, ${ROTULO_STATUS[a.status]}`}
                        className={`absolute inset-x-1.5 z-[1] flex flex-col justify-start overflow-hidden rounded-sm border border-l-[3px] border-borda-forte bg-elevado px-2.5 py-1 text-left transition-colors hover:border-texto-disc ${BORDA_STATUS[a.status]} ${
                          a.status === "concluido" ? "opacity-70" : ""
                        }`}
                        style={{ top: pos.topo * PX + 1, height: alturaPx - 2 }}
                      >
                        <span className="flex items-baseline gap-2 text-label">
                          <span className="numeros text-texto-sec">{formatarHora(a.inicio)}</span>
                          <span className="truncate font-semibold text-texto">{a.cliente.nome}</span>
                        </span>
                        {alturaPx >= 44 && (
                          <span className="block truncate text-label text-texto-sec">
                            {a.servico.nome}
                            {a.status === "agendado" && <span className="text-info">, a confirmar</span>}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {linhaAgora !== null && (
                    <div className="pointer-events-none absolute inset-x-0 z-20 border-t border-ouro" style={{ top: linhaAgora }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function posicaoMinutos(faixa: Faixa, de: number, ate: number) {
  const ini = Math.max(de, faixa.inicio);
  const fim = Math.min(ate, faixa.fim);
  return fim > ini ? { topo: (ini - faixa.inicio) * PX, altura: (fim - ini) * PX } : null;
}

/** Lista do celular: um bloco por barbeiro, na ordem do dia. */
function Lista({ data, barbeiros, ativos, bloqueios, aoAbrirAgendamento, aoAbrirBloqueio, abertoNoDia }: PropsVisao) {
  return (
    <div className="flex flex-col gap-4 lg:hidden">
      {barbeiros.map((b) => {
        type Item =
          | { tipo: "agendamento"; inicio: string; a: AgendamentoPainel }
          | { tipo: "bloqueio"; inicio: string; x: BloqueioPainel }
          | { tipo: "almoco"; inicio: string; fim: string };
        const itens: Item[] = [
          ...ativos.filter((a) => a.barbeiroId === b.id).map((a) => ({ tipo: "agendamento" as const, inicio: a.inicio, a })),
          ...bloqueios
            .filter((x) => x.barbeiroId === null || x.barbeiroId === b.id)
            .map((x) => ({ tipo: "bloqueio" as const, inicio: x.inicio, x })),
        ];
        const j = b.jornada;
        if (j?.almocoInicio && j.almocoFim) {
          itens.push({ tipo: "almoco", inicio: horaLocalIso(data, j.almocoInicio), fim: horaLocalIso(data, j.almocoFim) });
        }
        itens.sort((x, y) => new Date(x.inicio).getTime() - new Date(y.inicio).getTime());
        const temCliente = itens.some((i) => i.tipo === "agendamento");

        return (
          <Painel key={b.id} aria-label={`Agenda de ${b.nome}`}>
            <div className="flex items-baseline justify-between gap-3 border-b border-borda px-4 py-3">
              <h2 className="truncate font-titulo text-subtitulo font-semibold">{b.nome}</h2>
              <p className="shrink-0 text-label text-texto-sec">{j ? `${horaCurta(j.inicio)} às ${horaCurta(j.fim)}` : "Folga"}</p>
            </div>
            {!temCliente && (
              <p className="px-4 pt-4 text-texto-sec">{abertoNoDia && j ? "Nenhum cliente marcado." : "Sem atendimento neste dia."}</p>
            )}
            <ul className="flex flex-col gap-1.5 p-2">
              {itens.map((item) => {
                if (item.tipo === "almoco") {
                  return (
                    <li key="almoco" className="grid grid-cols-[3.5rem_1fr] items-center gap-3 rounded-sm px-2 py-2.5 text-label text-texto-disc" style={HACHURA}>
                      <span className="numeros">{formatarHora(item.inicio)}</span>
                      <span>Almoço até {formatarHora(item.fim)}</span>
                    </li>
                  );
                }
                if (item.tipo === "bloqueio") {
                  const x = item.x;
                  const diaTodo = new Date(x.fim).getTime() - new Date(x.inicio).getTime() >= 24 * 60 * 60 * 1000 || x.tipo !== "bloqueio";
                  return (
                    <li key={x.id}>
                      <button
                        type="button"
                        onClick={() => aoAbrirBloqueio(x.id)}
                        className="grid w-full grid-cols-[3.5rem_1fr] items-center gap-3 rounded-sm border border-dashed border-borda-forte px-2 py-2.5 text-left text-label text-texto-sec"
                        style={HACHURA}
                      >
                        <span className="numeros">{diaTodo ? "Dia" : formatarHora(x.inicio)}</span>
                        <span className="min-w-0">
                          <span className="font-medium text-texto">
                            {x.tipo === "folga" ? "Folga" : x.tipo === "feriado" ? "Fechado" : `Bloqueado até ${formatarHora(x.fim)}`}
                          </span>
                          {x.motivo && <span className="block truncate">{x.motivo}</span>}
                        </span>
                      </button>
                    </li>
                  );
                }
                const a = item.a;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => aoAbrirAgendamento(a.id)}
                      className={`grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-sm border border-l-[3px] border-borda bg-elevado px-2 py-2.5 text-left transition-colors hover:border-borda-forte ${BORDA_STATUS[a.status]}`}
                    >
                      <span className="numeros font-medium">{formatarHora(a.inicio)}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-texto">{a.cliente.nome}</span>
                        <span className="block truncate text-label text-texto-sec">{a.servico.nome}</span>
                      </span>
                      <SeloStatus valor={a.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Painel>
        );
      })}
    </div>
  );
}

/** "12:00:00" no dia local -> ISO, para ordenar o almoço junto com os agendamentos. */
function horaLocalIso(data: string, hora: string) {
  return instanteLocal(data, horaParaMinutos(hora)).toISOString();
}
