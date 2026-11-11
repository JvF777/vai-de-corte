import { CalendarCheck, QrCode, Scissors, Store } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { CtaCadastro, ESPACO_SECAO, Etiqueta, LARGURA, Secao, TituloSecao } from "./base";
import { PASSOS } from "./conteudo";

const ICONES = [Store, QrCode, CalendarCheck, Scissors];

/** Como funciona: 4 passos ligados por uma linha dourada (vertical no celular). */
export function SecaoPassos() {
  return (
    <Secao id="como-funciona" rotulo="Como funciona">
      <Revelar aoRolar className={`${LARGURA} ${ESPACO_SECAO}`}>
        <Etiqueta>Como funciona</Etiqueta>
        <TituloSecao id="titulo-como-funciona">Do cadastro à cadeira cheia.</TituloSecao>

        <ol className="relative mt-14 grid gap-10 lg:mt-20 lg:grid-cols-4 lg:gap-8">
          {/* Linha que liga os passos */}
          <span aria-hidden className="absolute top-6 bottom-6 left-6 w-px bg-ouro-discreto/60 lg:top-6 lg:right-[12%] lg:bottom-auto lg:left-6 lg:h-px lg:w-auto" />
          {PASSOS.map((p, i) => {
            const Icone = ICONES[i];
            return (
              <li key={p.titulo} data-anima className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-5 lg:block">
                <span className="relative inline-flex size-12 items-center justify-center rounded-full border border-ouro bg-fundo text-ouro [&_svg]:size-5">
                  <Icone aria-hidden strokeWidth={1.6} />
                </span>
                <div className="lg:mt-6">
                  <p className="numeros text-label font-semibold tracking-[0.12em] text-texto-disc">PASSO {i + 1}</p>
                  <h3 className="mt-1.5 font-titulo text-secao font-bold">{p.titulo}</h3>
                  <p className="mt-2 max-w-[34ch] text-base leading-relaxed text-texto-sec">{p.texto}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-14 lg:mt-20">
          <CtaCadastro texto="Começar agora, leva 5 minutos" />
        </div>
      </Revelar>
    </Secao>
  );
}
