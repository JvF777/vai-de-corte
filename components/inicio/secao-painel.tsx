import Image from "next/image";
import { Check } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import fotoFerramentas from "@/public/vitrine/ferramentas.jpg";
import posterMaquina from "@/public/vitrine/maquina-poster.jpg";
import posterNavalha from "@/public/vitrine/navalha-poster.jpg";
import fotoPoste from "@/public/vitrine/poste-barbeiro.jpg";
import { CtaCadastro, ESPACO_SECAO, Etiqueta, LARGURA, Secao, TextoApoio, TituloSecao } from "./base";
import { PAINEL } from "./conteudo";

// Uma foto por card, na mesma ordem de PAINEL.cards.
const FOTOS = [
  { foto: posterMaquina, alt: "Barbeiro passando a máquina na nuca do cliente" },
  { foto: fotoFerramentas, alt: "Pincel, navalhas e pentes de máquina na bancada" },
  { foto: posterNavalha, alt: "Mãos abrindo uma navalha dourada" },
  { foto: fotoPoste, alt: "Poste de barbeiro listrado em vermelho, branco e azul numa parede de tijolos" },
];

/** O que o dono recebe: 4 cards com foto e, embaixo, a lista do que mais vem no painel. */
export function SecaoPainel() {
  return (
    <Secao id="recursos" rotulo="Recursos">
      <Revelar aoRolar className={`${LARGURA} ${ESPACO_SECAO}`}>
        <Etiqueta>Para você e sua equipe</Etiqueta>
        <TituloSecao id="titulo-recursos">{PAINEL.titulo}</TituloSecao>
        <TextoApoio>{PAINEL.texto}</TextoApoio>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {PAINEL.cards.map((c, i) => (
            <li key={c.titulo} data-anima className="group overflow-hidden rounded-md border border-borda bg-card">
              <div className="aspect-[4/3] overflow-hidden">
                <Image
                  src={FOTOS[i].foto}
                  alt={FOTOS[i].alt}
                  sizes="(min-width: 1024px) 300px, (min-width: 640px) 46vw, 100vw"
                  placeholder="blur"
                  className="size-full object-cover transition-transform duration-700 ease-saida group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="font-titulo text-subtitulo font-bold">{c.titulo}</h3>
                <p className="mt-2 text-base leading-relaxed text-texto-sec">{c.texto}</p>
              </div>
            </li>
          ))}
        </ul>

        <div data-anima className="mt-10 flex flex-col gap-8 rounded-md border border-borda p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {PAINEL.extras.map((e) => (
              <li key={e} className="flex items-start gap-2.5 text-base text-texto">
                <Check className="mt-1 size-4 shrink-0 text-ouro" aria-hidden />
                {e}
              </li>
            ))}
          </ul>
          <div className="shrink-0">
            <CtaCadastro />
          </div>
        </div>
      </Revelar>
    </Secao>
  );
}
