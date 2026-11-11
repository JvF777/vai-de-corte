import { MessageCircle, Plus } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { classesBotao } from "@/components/ui/botao";
import { ESPACO_SECAO, Etiqueta, LARGURA, Secao, TextoApoio, TituloSecao } from "./base";
import { FAQ, linkWhatsApp } from "./conteudo";

/** Perguntas frequentes em acordeão nativo (<details>): funciona até sem JavaScript. */
export function SecaoFaq() {
  const whatsapp = linkWhatsApp("Oi! Tenho uma dúvida sobre o Vai de Corte.");
  return (
    <Secao id="duvidas" rotulo="Dúvidas">
      <Revelar aoRolar className={`${LARGURA} ${ESPACO_SECAO} grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20`}>
        <div>
          <Etiqueta>Dúvidas</Etiqueta>
          <TituloSecao id="titulo-duvidas">Perguntas frequentes.</TituloSecao>
          <TextoApoio>Não achou a sua? Fale direto com o time.</TextoApoio>
          {whatsapp && (
            <div data-anima className="mt-7">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={classesBotao("contorno", "lg", "px-6")}>
                <MessageCircle aria-hidden />
                Chamar no WhatsApp
              </a>
            </div>
          )}
        </div>

        <div className="border-t border-borda">
          {FAQ.map((f) => (
            <details key={f.pergunta} data-anima className="group border-b border-borda">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 font-titulo text-subtitulo font-semibold text-texto transition-colors hover:text-ouro [&::-webkit-details-marker]:hidden">
                {f.pergunta}
                <Plus aria-hidden className="size-5 shrink-0 text-ouro transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="max-w-[60ch] pb-6 text-base leading-relaxed text-texto-sec">{f.resposta}</p>
            </details>
          ))}
        </div>
      </Revelar>
    </Secao>
  );
}
