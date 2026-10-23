"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dataValida, somarDias } from "@/lib/availability";

/** Anterior, hoje, próximo e um seletor de data. Tudo vira ?data= na URL (dá para voltar e compartilhar). */
export function NavegacaoDia({ data, hoje, barbeiro }: { data: string; hoje: string; barbeiro: string | null }) {
  const router = useRouter();
  const url = (d: string) => `/painel/agenda?data=${d}${barbeiro ? `&barbeiro=${barbeiro}` : ""}`;
  const seta = "flex size-11 items-center justify-center rounded-sm border border-borda text-texto-sec transition-colors hover:border-borda-forte hover:text-texto";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={url(somarDias(data, -1))} className={seta} aria-label="Dia anterior">
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
      <Link
        href={url(hoje)}
        aria-current={data === hoje ? "date" : undefined}
        className={`inline-flex min-h-11 items-center rounded-sm border px-4 transition-colors ${
          data === hoje ? "border-borda-forte text-texto" : "border-borda text-texto-sec hover:border-borda-forte hover:text-texto"
        }`}
      >
        Hoje
      </Link>
      <Link href={url(somarDias(data, 1))} className={seta} aria-label="Próximo dia">
        <ChevronRight className="size-5" aria-hidden />
      </Link>
      <label className="sr-only" htmlFor="data-agenda">
        Ir para a data
      </label>
      <input
        id="data-agenda"
        type="date"
        value={data}
        onChange={(e) => {
          if (dataValida(e.target.value)) router.push(url(e.target.value));
        }}
        className="numeros min-h-11 rounded-sm border border-borda bg-transparent px-3 text-base text-texto-sec transition-colors hover:border-borda-forte focus-visible:border-ouro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro/40"
      />
    </div>
  );
}
