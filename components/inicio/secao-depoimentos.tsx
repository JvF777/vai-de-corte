import Link from "next/link";
import { Revelar } from "@/components/animacao/revelar";
import { ESPACO_SECAO, Etiqueta, LARGURA, Secao, TituloSecao } from "./base";
import { DEPOIMENTOS } from "./conteudo";

/**
 * Barbearias reais que já usam. Some sozinha enquanto DEPOIMENTOS (em conteudo.ts) estiver vazio:
 * nada de depoimento inventado.
 */
export function SecaoDepoimentos() {
  if (DEPOIMENTOS.length === 0) return null;
  return (
    <Secao id="quem-usa" tom="superficie" rotulo="Quem já usa">
      <Revelar aoRolar className={`${LARGURA} ${ESPACO_SECAO}`}>
        <Etiqueta>Quem já usa</Etiqueta>
        <TituloSecao id="titulo-quem-usa">Barbearias do Alto Tietê que já marcam pelo link.</TituloSecao>
        <ul className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {DEPOIMENTOS.map((d) => (
            <li key={d.barbearia} data-anima className="flex flex-col rounded-md border border-borda bg-card p-6 sm:p-7">
              <span aria-hidden className="font-titulo text-5xl leading-none text-ouro">“</span>
              <blockquote className="mt-2 flex-1 text-[1.0625rem] leading-relaxed text-texto">{d.frase}</blockquote>
              <p className="mt-6 text-base font-semibold text-texto">{d.dono}</p>
              <p className="text-label text-texto-sec">
                {d.barbearia} · {d.cidade}
              </p>
              {d.link && (
                <Link href={d.link} className="mt-4 text-label font-medium text-ouro underline-offset-4 hover:underline">
                  Ver a página da barbearia
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Revelar>
    </Secao>
  );
}
