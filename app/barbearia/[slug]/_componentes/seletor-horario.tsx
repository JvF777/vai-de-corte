"use client";

import { useRef } from "react";
import { COM_MOVIMENTO, gsap, useGSAP } from "@/components/animacao/gsap";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { horaParaMinutos, type DiaAgenda, type Horario } from "@/lib/availability";
import { partesDoDia } from "@/lib/formatos";
import type { ResultadoHorarios } from "../actions";

const PERIODOS = [
  { nome: "Manhã", ate: 12 * 60 },
  { nome: "Tarde", ate: 18 * 60 },
  { nome: "Noite", ate: 24 * 60 },
];

type Props = {
  dias: DiaAgenda[];
  data: string | null;
  onEscolherDia: (data: string) => void;
  resultado: ResultadoHorarios | null;
  carregando: boolean;
  escolhido: Horario | null;
  onEscolherHorario: (h: Horario) => void;
  /** Em "qualquer barbeiro": primeiro nome de cada barbeiro, para mostrar quem atende em cada horário. */
  nomes?: Record<string, string>;
  onTentarDeNovo: () => void;
  /** Só quando um barbeiro específico foi escolhido e há outros que fazem o serviço. */
  onVerQualquer?: () => void;
};

export function SeletorHorario(props: Props) {
  const { dias, data, onEscolherDia, resultado, carregando, escolhido, onEscolherHorario, onTentarDeNovo, onVerQualquer, nomes } = props;
  const escopo = useRef<HTMLDivElement>(null);

  // Os horários do dia entram um a um, como a agenda sendo montada.
  useGSAP(
    () => {
      if (carregando || !resultado?.horarios.length) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        gsap.from("[data-horario]", { autoAlpha: 0, y: 6, duration: 0.3, stagger: 0.012, clearProps: "all" });
      });
      return () => mm.revert();
    },
    { scope: escopo, dependencies: [resultado, carregando] },
  );

  // Passada da navalha: ao tocar num horário, o dourado entra na diagonal com o fio
  // da lâmina brilhando na frente. Só quando o cliente toca (não ao voltar à etapa).
  const tocado = useRef<string | null>(null);
  useGSAP(
    () => {
      if (!escolhido || tocado.current !== escolhido.inicio) return;
      tocado.current = null;
      const botao = escopo.current?.querySelector<HTMLButtonElement>("[data-horario][aria-pressed='true']");
      const fundo = botao?.querySelector<HTMLElement>("[data-navalha]");
      const fio = botao?.querySelector<HTMLElement>("[data-fio]");
      if (!botao || !fundo || !fio) return;

      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const passada = { p: 0 };
        const desenhar = () => {
          const x = passada.p * 140;
          fundo.style.clipPath = `polygon(0 0, ${x}% 0, ${x - 40}% 100%, 0 100%)`;
          fio.style.left = `${x - 20}%`;
        };
        desenhar();
        gsap
          .timeline({ onComplete: () => fundo.style.removeProperty("clip-path") })
          .to(passada, { p: 1, duration: 0.42, ease: "power2.inOut", onUpdate: desenhar }, 0)
          .fromTo(fio, { opacity: 1 }, { opacity: 0, duration: 0.15 }, 0.3)
          .from(botao, { color: "#f5f1e8", duration: 0.3, ease: "none" }, 0.08)
          .fromTo(botao, { scale: 0.95 }, { scale: 1, duration: 0.4, ease: "back.out(2.5)", clearProps: "transform" }, 0);
      });
      return () => mm.revert();
    },
    { scope: escopo, dependencies: [escolhido?.inicio] },
  );

  const proximoDia = data ? dias.find((d) => d.atende && d.data > data) : undefined;

  return (
    <div ref={escopo} className="flex flex-col gap-6">
      <div>
        <p id="rotulo-dias" className="text-label font-medium text-texto-sec">
          Dia
        </p>
        <ul
          aria-labelledby="rotulo-dias"
          className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:-mx-0 sm:px-0"
        >
          {dias.map((d, i) => {
            const p = partesDoDia(d.data);
            const selecionado = d.data === data;
            const mostrarMes = i === 0 || p.dia === "1";
            return (
              <li key={d.data} className="shrink-0">
                <button
                  type="button"
                  disabled={!d.atende}
                  aria-pressed={selecionado}
                  aria-label={`${p.completa}${d.atende ? "" : ", sem atendimento"}`}
                  onClick={() => onEscolherDia(d.data)}
                  className={`numeros flex h-[4.5rem] w-14 flex-col items-center justify-center rounded-sm border transition-colors disabled:cursor-not-allowed ${
                    selecionado
                      ? "border-ouro bg-ouro text-sobre-ouro"
                      : d.atende
                        ? "border-borda-forte bg-card text-texto hover:border-ouro-discreto"
                        : "border-transparent text-texto-disc/70"
                  }`}
                >
                  <span className={`text-[0.75rem] capitalize ${selecionado ? "" : "text-texto-sec"} ${d.atende ? "" : "!text-texto-disc/70"}`}>
                    {i === 0 ? "hoje" : p.semana}
                  </span>
                  <span className="font-titulo text-[1.25rem] font-bold leading-tight">{p.dia}</span>
                  <span className={`text-[0.6875rem] leading-none ${mostrarMes ? "" : "invisible"}`}>{p.mes}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div aria-live="polite" aria-busy={carregando}>
        {!data ? null : carregando || !resultado ? (
          <EsqueletoHorarios />
        ) : resultado.erro ? (
          <div className="flex flex-col items-start gap-3">
            <Aviso tipo="erro">{resultado.erro}</Aviso>
            <Botao variante="secundario" onClick={onTentarDeNovo}>
              Tentar de novo
            </Botao>
          </div>
        ) : resultado.horarios.length === 0 ? (
          <div className="rounded-md border border-borda bg-card p-5">
            <p className="font-medium">Nenhum horário livre em {partesDoDia(data).completa}.</p>
            <p className="mt-1 text-texto-sec">A agenda desse dia está cheia ou já passou do horário.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {proximoDia && (
                <Botao variante="secundario" onClick={() => onEscolherDia(proximoDia.data)}>
                  Ver {partesDoDia(proximoDia.data).semanaLonga}, {partesDoDia(proximoDia.data).dia}
                </Botao>
              )}
              {onVerQualquer && (
                <Botao variante="fantasma" onClick={onVerQualquer}>
                  Ver com qualquer barbeiro
                </Botao>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {PERIODOS.map((periodo, i) => {
              const de = i === 0 ? 0 : PERIODOS[i - 1].ate;
              const lista = resultado.horarios.filter((h) => {
                const m = horaParaMinutos(h.hora);
                return m >= de && m < periodo.ate;
              });
              if (!lista.length) return null;
              const idRotulo = `periodo-${periodo.nome}`;
              return (
                <div key={periodo.nome}>
                  <p id={idRotulo} className="text-label font-medium text-texto-sec">
                    {periodo.nome}
                  </p>
                  <div role="group" aria-labelledby={idRotulo} className="mt-2 grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                    {lista.map((h) => {
                      const selecionado = escolhido?.inicio === h.inicio;
                      const quem = nomes ? h.barbeiroIds.map((id) => nomes[id]).filter(Boolean) : [];
                      const textoQuem = quem.length > 2 ? `${quem.length} barbeiros` : quem.join(" ou ");
                      return (
                        <button
                          key={h.inicio}
                          type="button"
                          data-horario
                          aria-pressed={selecionado}
                          aria-label={textoQuem ? `${h.hora}, com ${textoQuem}` : undefined}
                          onClick={() => {
                            tocado.current = h.inicio;
                            onEscolherHorario(h);
                          }}
                          className={`numeros relative flex min-h-11 flex-col items-center justify-center overflow-hidden rounded-sm border px-1 py-1.5 text-base font-medium transition-colors ${
                            selecionado
                              ? "border-ouro bg-card text-sobre-ouro"
                              : "border-borda-forte bg-card text-texto hover:border-ouro-discreto"
                          }`}
                        >
                          {selecionado && (
                            <>
                              <span data-navalha className="absolute inset-0 bg-ouro" aria-hidden />
                              <span
                                data-fio
                                className="pointer-events-none absolute -inset-y-2 left-[110%] w-0.5 rotate-[22deg] bg-texto opacity-0"
                                aria-hidden
                              />
                            </>
                          )}
                          <span className="relative">{h.hora}</span>
                          {textoQuem && (
                            <span
                              className={`relative mt-0.5 w-full truncate text-[0.6875rem] font-normal leading-tight ${selecionado ? "text-sobre-ouro" : "text-texto-sec"}`}
                              aria-hidden
                            >
                              {textoQuem}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EsqueletoHorarios() {
  return (
    <div>
      <span className="sr-only">Carregando horários livres...</span>
      <div className="h-4 w-14 rounded-sm bg-card" />
      <div className="mt-2 grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 md:grid-cols-5 xl:grid-cols-6" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-sm bg-card" />
        ))}
      </div>
    </div>
  );
}
