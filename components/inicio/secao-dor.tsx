import { Revelar } from "@/components/animacao/revelar";
import { ESPACO_SECAO, Etiqueta, LARGURA, Secao, TituloSecao } from "./base";
import { DORES, SOBRE } from "./conteudo";

/** A dor do dia a dia (três frases curtas) e, logo abaixo, quem somos e o que resolvemos. */
export function SecaoDor() {
  return (
    <Secao id="sobre" tom="superficie" rotulo="Sobre">
      <Revelar aoRolar className={`${LARGURA} ${ESPACO_SECAO}`}>
        <ul className="grid gap-px overflow-hidden rounded-md border border-borda bg-borda md:grid-cols-3">
          {DORES.map((d, i) => (
            <li key={d.titulo} data-anima className="bg-superficie p-6 sm:p-8">
              <span className="numeros font-titulo text-label font-semibold text-ouro-discreto">0{i + 1}</span>
              <p className="mt-3 font-titulo text-secao font-bold text-texto line-through decoration-ouro/70 decoration-2">
                {d.titulo}
              </p>
              <p className="mt-2 text-base leading-relaxed text-texto-sec">{d.texto}</p>
            </li>
          ))}
        </ul>

        <div className="mt-20 grid gap-10 lg:mt-28 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div>
            <Etiqueta>Sobre</Etiqueta>
            <TituloSecao id="titulo-sobre">{SOBRE.titulo}</TituloSecao>
          </div>
          <div className="flex flex-col gap-5 lg:pt-12">
            {SOBRE.paragrafos.map((p) => (
              <p key={p.slice(0, 24)} data-anima className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-texto-sec first:text-texto">
                {p}
              </p>
            ))}
          </div>
        </div>
      </Revelar>
    </Secao>
  );
}
