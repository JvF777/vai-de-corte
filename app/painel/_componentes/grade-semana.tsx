"use client";

import { useState } from "react";
import { Caixa } from "@/components/ui/caixa";
import { SEMANA } from "@/lib/painel/agenda";

export type HorarioDia = { inicio: string; fim: string; almocoInicio?: string | null; almocoFim?: string | null };

type Props = {
  /** Horário atual de cada dia (0 = domingo). Dia ausente = não trabalha / fechado. */
  valores: Partial<Record<number, HorarioDia>>;
  comAlmoco: boolean;
  erros?: Record<string, string>;
  /** Texto do dia desmarcado: "Folga" para barbeiro, "Fechado" para a barbearia. */
  rotuloFora: string;
  /** Sugestão para um dia que é marcado agora (ex.: horário da barbearia). */
  padrao?: (dia: number) => HorarioDia;
  /** Linha de ajuda por dia (ex.: "Barbearia: 9h às 19h"). */
  dica?: (dia: number) => string | null;
};

const hhmm = (v?: string | null) => (v ? v.slice(0, 5) : "");

/** Semana de segunda a domingo com início, fim e almoço opcional. Os nomes dos campos seguem ler-semana.ts. */
export function GradeSemana({ valores, comAlmoco, erros = {}, rotuloFora, padrao, dica }: Props) {
  const [abertos, setAbertos] = useState(() => new Set(Object.keys(valores).map(Number)));
  const [almocos, setAlmocos] = useState(
    () => new Set(Object.entries(valores).flatMap(([d, v]) => (v?.almocoInicio ? [Number(d)] : []))),
  );

  const alternar = (conjunto: Set<number>, dia: number, ligado: boolean) => {
    const novo = new Set(conjunto);
    if (ligado) novo.add(dia);
    else novo.delete(dia);
    return novo;
  };

  return (
    <div className="flex flex-col divide-y divide-borda">
      {SEMANA.map(({ dia, nome }) => {
        const aberto = abertos.has(dia);
        const comAlmocoNoDia = almocos.has(dia);
        const v = valores[dia] ?? padrao?.(dia) ?? { inicio: "09:00", fim: "18:00" };
        const ajuda = dica?.(dia);
        const erroLinha = [`inicio_${dia}`, `fim_${dia}`, `almoco_inicio_${dia}`, `almoco_fim_${dia}`]
          .map((c) => erros[c])
          .find(Boolean);

        return (
          <div key={dia} className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[9rem_1fr] sm:items-start">
            <Caixa
              name={`aberto_${dia}`}
              value="sim"
              checked={aberto}
              onChange={(e) => setAbertos((s) => alternar(s, dia, e.target.checked))}
              rotulo={<span className={aberto ? "font-medium" : "text-texto-sec"}>{nome}</span>}
            />

            {aberto ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:w-auto">
                    <CampoHora nome={`inicio_${dia}`} valor={hhmm(v.inicio)} rotulo={`${nome}, começa`} erro={Boolean(erros[`inicio_${dia}`])} />
                    <span className="text-texto-sec">às</span>
                    <CampoHora nome={`fim_${dia}`} valor={hhmm(v.fim)} rotulo={`${nome}, termina`} erro={Boolean(erros[`fim_${dia}`])} />
                  </div>
                  {comAlmoco && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Caixa
                        name={`almoco_${dia}`}
                        value="sim"
                        checked={comAlmocoNoDia}
                        onChange={(e) => setAlmocos((s) => alternar(s, dia, e.target.checked))}
                        rotulo={<span className="text-texto-sec">Almoço</span>}
                      />
                      {comAlmocoNoDia && (
                        <>
                          <CampoHora
                            nome={`almoco_inicio_${dia}`}
                            valor={hhmm(v.almocoInicio) || "12:00"}
                            rotulo={`${nome}, almoço começa`}
                            erro={Boolean(erros[`almoco_inicio_${dia}`])}
                          />
                          <span className="text-texto-sec">às</span>
                          <CampoHora
                            nome={`almoco_fim_${dia}`}
                            valor={hhmm(v.almocoFim) || "13:00"}
                            rotulo={`${nome}, almoço termina`}
                            erro={Boolean(erros[`almoco_fim_${dia}`])}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
                {erroLinha && <p className="text-label text-erro">{erroLinha}</p>}
                {ajuda && !erroLinha && <p className="text-label text-texto-disc">{ajuda}</p>}
              </div>
            ) : (
              <p className="flex min-h-11 items-center text-texto-disc">{rotuloFora}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CampoHora({ nome, valor, rotulo, erro }: { nome: string; valor: string; rotulo: string; erro: boolean }) {
  return (
    <input
      type="time"
      name={nome}
      defaultValue={valor}
      step={300}
      aria-label={rotulo}
      aria-invalid={erro || undefined}
      className="numeros min-h-11 w-full min-w-0 rounded-sm sm:w-[8.25rem] border border-borda-campo bg-superficie px-3 text-base text-texto transition-colors hover:border-texto-disc focus-visible:border-ouro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro/40 aria-invalid:border-erro"
    />
  );
}
