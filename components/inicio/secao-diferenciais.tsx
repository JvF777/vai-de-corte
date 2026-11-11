import { BellRing, CalendarClock, CalendarPlus, Gift, MessageCircle, MoonStar, ShieldCheck, Users } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { ESPACO_SECAO, Etiqueta, LARGURA, Secao, TituloSecao } from "./base";
import { DIFERENCIAIS } from "./conteudo";

const ICONES = {
  gratis: Gift,
  duplicado: ShieldCheck,
  dia: CalendarClock,
  qualquer: Users,
  fechado: MoonStar,
  whatsapp: MessageCircle,
  aviso: BellRing,
  agenda: CalendarPlus,
} as const;

/** Os 8 diferenciais em grade, cada um com ícone, título e uma frase. */
export function SecaoDiferenciais() {
  return (
    <Secao id="diferenciais" tom="superficie" rotulo="Diferenciais">
      <Revelar aoRolar className={`${LARGURA} ${ESPACO_SECAO}`}>
        <Etiqueta>Diferenciais</Etiqueta>
        <TituloSecao id="titulo-diferenciais">{DIFERENCIAIS.titulo}</TituloSecao>

        <ul className="mt-14 grid gap-px overflow-hidden rounded-md border border-borda bg-borda sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {DIFERENCIAIS.itens.map((d) => {
            const Icone = ICONES[d.icone];
            return (
              <li key={d.titulo} data-anima className="bg-superficie p-6 sm:p-7">
                <span className="inline-flex size-11 items-center justify-center rounded-sm border border-borda bg-card text-ouro [&_svg]:size-5">
                  <Icone aria-hidden strokeWidth={1.6} />
                </span>
                <h3 className="mt-5 font-titulo text-subtitulo font-bold">{d.titulo}</h3>
                <p className="mt-2 text-base leading-relaxed text-texto-sec">{d.texto}</p>
              </li>
            );
          })}
        </ul>
      </Revelar>
    </Secao>
  );
}
