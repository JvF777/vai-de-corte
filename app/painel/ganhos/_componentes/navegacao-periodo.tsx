"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dataValida, somarDias } from "@/lib/availability";
import { somarMeses, urlGanhos, type Periodo } from "@/lib/painel/ganhos";

type Props = { periodo: Periodo; data: string; hoje: string; barbeiro: string | null };

/** Dia ou mês, anterior, hoje, próximo e um seletor de data. */
export function NavegacaoPeriodo({ periodo, data, hoje, barbeiro }: Props) {
  const router = useRouter();
  const mover = (n: number) => (periodo === "mes" ? somarMeses(data, n) : somarDias(data, n));
  const atual = periodo === "mes" ? data.slice(0, 7) === hoje.slice(0, 7) : data === hoje;
  const seta =
    "flex size-11 items-center justify-center rounded-sm border border-borda text-texto-sec transition-colors hover:border-borda-forte hover:text-texto";
  const campo =
    "numeros min-h-11 rounded-sm border border-borda bg-transparent px-3 text-base text-texto-sec transition-colors hover:border-borda-forte focus-visible:border-ouro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro/40";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Dia ou mês: um controle segmentado, um toque troca. */}
      <div role="group" aria-label="Período" className="flex rounded-sm border border-borda p-1">
        {(["dia", "mes"] as const).map((p) => {
          const ativo = p === periodo;
          // Do mês atual para "Dia" cai em hoje; de outro mês, no dia 1 dele.
          const destino = p === "dia" && periodo === "mes" && atual ? hoje : data;
          return (
            <Link
              key={p}
              href={urlGanhos(p, destino, barbeiro)}
              aria-current={ativo ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-[6px] px-4 transition-colors ${
                ativo ? "bg-elevado font-medium text-texto" : "text-texto-sec hover:text-texto"
              }`}
            >
              {p === "dia" ? "Dia" : "Mês"}
            </Link>
          );
        })}
      </div>

      <Link href={urlGanhos(periodo, mover(-1), barbeiro)} className={seta} aria-label={periodo === "mes" ? "Mês anterior" : "Dia anterior"}>
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
      <Link
        href={urlGanhos(periodo, hoje, barbeiro)}
        aria-current={atual ? "date" : undefined}
        className={`inline-flex min-h-11 items-center rounded-sm border px-4 transition-colors ${
          atual ? "border-borda-forte text-texto" : "border-borda text-texto-sec hover:border-borda-forte hover:text-texto"
        }`}
      >
        {periodo === "mes" ? "Este mês" : "Hoje"}
      </Link>
      <Link href={urlGanhos(periodo, mover(1), barbeiro)} className={seta} aria-label={periodo === "mes" ? "Próximo mês" : "Próximo dia"}>
        <ChevronRight className="size-5" aria-hidden />
      </Link>

      <label className="sr-only" htmlFor="data-ganhos">
        {periodo === "mes" ? "Ir para o mês" : "Ir para a data"}
      </label>
      {periodo === "mes" ? (
        <input
          id="data-ganhos"
          type="month"
          value={data.slice(0, 7)}
          onChange={(e) => {
            const d = `${e.target.value}-01`;
            if (dataValida(d)) router.push(urlGanhos("mes", d, barbeiro));
          }}
          className={campo}
        />
      ) : (
        <input
          id="data-ganhos"
          type="date"
          value={data}
          onChange={(e) => {
            if (dataValida(e.target.value)) router.push(urlGanhos("dia", e.target.value, barbeiro));
          }}
          className={campo}
        />
      )}
    </div>
  );
}
