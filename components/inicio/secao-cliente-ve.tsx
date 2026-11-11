import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { classesBotao } from "@/components/ui/botao";
import { ESPACO_SECAO, Etiqueta, LARGURA, Secao, TextoApoio, TituloSecao } from "./base";
import { CelularAgendamento } from "./celular-agendamento";
import { CLIENTE_VE, LINKS } from "./conteudo";

/** As 4 telas que o cliente vê no link. No celular elas deslizam para o lado. */
export function SecaoClienteVe() {
  return (
    <Secao id="cliente" tom="superficie" rotulo="O que o cliente vê">
      <Revelar aoRolar className={`${ESPACO_SECAO}`}>
        <div className={`${LARGURA} grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end`}>
          <div>
            <Etiqueta>Para o seu cliente</Etiqueta>
            <TituloSecao id="titulo-cliente">{CLIENTE_VE.titulo}</TituloSecao>
            <TextoApoio>{CLIENTE_VE.texto}</TextoApoio>
          </div>
          <div data-anima>
            <Link href={LINKS.exemplo} className={classesBotao("contorno", "lg", "px-6")}>
              Ver uma barbearia de exemplo
              <ArrowUpRight aria-hidden />
            </Link>
          </div>
        </div>

        <div className={`${LARGURA} mt-14 max-lg:px-0 lg:mt-20`}>
          <ol className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-8 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible lg:px-0 lg:pb-0">
            {CLIENTE_VE.telas.map((t, i) => (
              <li key={t.tela} data-anima className="w-[62vw] max-w-[15rem] shrink-0 snap-center lg:w-auto lg:max-w-none">
                <CelularAgendamento tela={t.tela} />
                <p className="mt-5 flex gap-2 text-base text-texto">
                  <span className="numeros font-semibold text-ouro">{i + 1}.</span>
                  {t.legenda}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Revelar>
    </Secao>
  );
}
