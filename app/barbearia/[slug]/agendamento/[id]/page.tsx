import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Download, ExternalLink, MapPin, MessageCircle } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { Marca } from "@/components/marca";
import { Aviso } from "@/components/ui/aviso";
import { classesBotao } from "@/components/ui/botao";
import { SeloStatus } from "@/components/ui/selo-status";
import { linkGoogleAgenda } from "@/lib/agenda-links";
import { formatarDataLonga, formatarDuracao, formatarHora, formatarPreco, linkWhatsapp } from "@/lib/formatos";
import { carregarAgendamento } from "@/lib/vitrine";
import { Tesoura } from "./tesoura";
import { enderecoCompleto, eventoDoAgendamento } from "./evento";

export const metadata: Metadata = {
  title: "Agendamento",
  // A página tem dados de um cliente: fora de buscadores.
  robots: { index: false, follow: false },
};

export default function PaginaAgendamento({ params }: PageProps<"/barbearia/[slug]/agendamento/[id]">) {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-10 sm:px-8 sm:pt-16">
        <Suspense fallback={<Carregando />}>
          <Conteudo params={params} />
        </Suspense>
      </main>
      <footer className="border-t border-borda">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-4 py-6 text-label text-texto-disc sm:px-8">
          <p>Agendamento online por</p>
          <Link href="/" className="rounded-sm opacity-80 transition-opacity hover:opacity-100">
            <Marca />
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando agendamento">
      <div className="size-14 rounded-full bg-elevado" />
      <div className="mt-6 h-10 w-72 max-w-full rounded-sm bg-elevado" />
      <div className="mt-8 h-72 rounded-lg border border-borda bg-card" />
    </div>
  );
}

async function Conteudo({ params }: Pick<PageProps<"/barbearia/[slug]/agendamento/[id]">, "params">) {
  const { slug, id } = await params;
  const a = await carregarAgendamento(id);
  if (!a || a.barbearia.slug !== slug) notFound();

  const ativo = a.status === "agendado" || a.status === "confirmado";
  const dia = formatarDataLonga(a.inicio);
  const hora = formatarHora(a.inicio);
  const local = enderecoCompleto(a);
  const mapa =
    a.barbearia.maps_url ?? (local ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}` : null);
  const mensagem = `Olá! Sou ${a.cliente_nome} e acabei de agendar pelo link: ${a.servico.nome} com ${a.barbeiro.nome}, ${dia}, às ${hora}.`;

  return (
    <Revelar atraso={0.5} className="flex flex-col gap-8">
      <header>
        {ativo && <Tesoura />}
        <h1 className="mt-6 font-titulo text-[2rem] font-bold leading-[1.1] tracking-[-0.025em] sm:text-titulo" data-anima>
          {ativo
            ? `Horário reservado, ${a.cliente_nome}`
            : a.status === "concluido"
              ? "Atendimento concluído"
              : "Este agendamento não está mais ativo"}
        </h1>
        <p className="mt-3 text-[1.0625rem] text-texto-sec" data-anima>
          {a.status === "agendado" && `A ${a.barbearia.nome} já tem o seu horário na agenda.`}
          {a.status === "confirmado" && "A barbearia confirmou o seu horário."}
          {!ativo && "Se precisar, fale com a barbearia ou agende um novo horário."}
        </p>
      </header>

      <section aria-label="Resumo do agendamento" className="rounded-lg border border-borda bg-card" data-anima>
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-borda-forte px-5 py-5 sm:px-6">
          <div>
            <p className="font-medium text-texto first-letter:uppercase">{dia}</p>
            <p className="numeros mt-1 font-titulo text-[2.75rem] font-bold leading-none tracking-[-0.03em] text-ouro">{hora}</p>
          </div>
          <SeloStatus valor={a.status} />
        </div>
        <dl className="flex flex-col gap-2.5 px-5 py-5 sm:px-6">
          {[
            ["Serviço", a.servico.nome],
            ["Barbeiro", a.barbeiro.nome],
            ["Duração", formatarDuracao(a.duracao_minutos)],
            ["Valor no local", formatarPreco(a.preco_centavos)],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="flex justify-between gap-4">
              <dt className="text-texto-sec">{rotulo}</dt>
              <dd className="numeros text-right text-texto">{valor}</dd>
            </div>
          ))}
        </dl>
        {local && (
          <div className="flex items-start gap-3 border-t border-borda px-5 py-4 sm:px-6">
            <MapPin className="mt-0.5 size-[18px] shrink-0 text-texto-disc" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{a.barbearia.nome}</p>
              <p className="text-texto-sec">{local}</p>
              {mapa && (
                <a
                  href={mapa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-sm text-label font-medium text-ouro-hover underline-offset-4 hover:underline"
                >
                  Abrir no mapa
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {ativo ? (
        <div className="flex flex-col gap-3" data-anima>
          {a.barbearia.whatsapp && (
            <a
              href={linkWhatsapp(a.barbearia.whatsapp, mensagem)}
              target="_blank"
              rel="noopener noreferrer"
              className={classesBotao("primario", "lg", "w-full")}
            >
              <MessageCircle aria-hidden />
              Avisar a barbearia no WhatsApp
            </a>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={linkGoogleAgenda(eventoDoAgendamento(a))}
              target="_blank"
              rel="noopener noreferrer"
              className={classesBotao("secundario", "md", "w-full")}
            >
              <CalendarPlus aria-hidden />
              Google Agenda
            </a>
            <a href={`/barbearia/${slug}/agendamento/${a.id}/agenda.ics`} download className={classesBotao("secundario", "md", "w-full")}>
              <Download aria-hidden />
              Salvar no celular (.ics)
            </a>
          </div>
          <p className="text-label text-texto-disc">
            Guarde esta página: o endereço dela é o comprovante do seu horário. Para remarcar ou cancelar, fale com a barbearia.
          </p>
        </div>
      ) : (
        <Aviso tipo="info">Este horário foi {a.status === "falta" ? "marcado como falta" : a.status === "concluido" ? "concluído" : "cancelado"}.</Aviso>
      )}

      <Link href={`/barbearia/${slug}`} className={classesBotao("fantasma", "md", "-ml-4 self-start")}>
        Agendar outro horário
      </Link>
    </Revelar>
  );
}
