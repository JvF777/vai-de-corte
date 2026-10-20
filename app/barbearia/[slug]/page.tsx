import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, MessageCircle } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { Marca } from "@/components/marca";
import { classesBotao } from "@/components/ui/botao";
import { linkWhatsapp } from "@/lib/formatos";
import { carregarVitrine, type Barbearia } from "@/lib/vitrine";
import { FluxoAgendamento } from "./_componentes/fluxo-agendamento";
import { Informacoes } from "./_componentes/informacoes";
import { situacaoAgora } from "./_componentes/funcionamento";

export async function generateMetadata({ params }: PageProps<"/barbearia/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const vitrine = await carregarVitrine(slug);
  if (!vitrine) return { title: "Barbearia não encontrada" };
  const { nome, descricao, cidade } = vitrine.barbearia;
  return {
    title: { absolute: `${nome}: agende seu horário` },
    description: descricao ?? `Agende seu horário na ${nome}${cidade ? `, em ${cidade}` : ""}, sem precisar mandar mensagem.`,
  };
}

export default function PaginaBarbearia({ params }: PageProps<"/barbearia/[slug]">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<Carregando />}>
        <Vitrine params={params} />
      </Suspense>
      <footer className="mt-auto border-t border-borda">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-label text-texto-disc sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Agendamento online por</p>
          <Link href="/" className="w-fit rounded-sm opacity-80 transition-opacity hover:opacity-100">
            <Marca />
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Mesmo esqueleto da página, sem pular quando os dados chegam. */
function Carregando() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-8 lg:pt-16" aria-busy="true" aria-label="Carregando a barbearia">
      <div className="size-16 rounded-md bg-elevado" />
      <div className="mt-6 h-12 w-[28rem] max-w-full rounded-sm bg-elevado" />
      <div className="mt-4 h-5 w-80 max-w-full rounded-sm bg-card" />
      <div className="mt-8 flex gap-3">
        <div className="h-12 w-44 rounded-sm bg-card" />
        <div className="h-12 w-32 rounded-sm bg-card" />
      </div>
      <div className="mt-16 h-96 rounded-lg border border-borda bg-card" />
    </div>
  );
}

async function Vitrine({ params }: Pick<PageProps<"/barbearia/[slug]">, "params">) {
  const { slug } = await params;
  const vitrine = await carregarVitrine(slug);
  if (!vitrine) notFound();

  const { barbearia, servicos, barbeiros, funcionamento } = vitrine;
  const agora = new Date();
  const situacao = situacaoAgora(funcionamento, agora);
  const local = [barbearia.endereco, [barbearia.cidade, barbearia.uf].filter(Boolean).join(" - ")].filter(Boolean).join(", ");

  return (
    <main className="flex-1">
      <Revelar className="mx-auto w-full max-w-6xl px-4 pb-12 pt-10 sm:px-8 lg:pb-16 lg:pt-16">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="min-w-0">
            <div data-anima>
              <Logo barbearia={barbearia} />
            </div>
            <h1 data-anima className="mt-6 max-w-[20ch] font-titulo text-[2.25rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[3rem] lg:text-[3.5rem]">
              {barbearia.nome}
            </h1>
            {barbearia.descricao && (
              <p data-anima className="mt-4 max-w-[58ch] text-[1.0625rem] leading-relaxed text-texto-sec">
                {barbearia.descricao}
              </p>
            )}
            <div data-anima className="mt-5 flex flex-col gap-2 text-base text-texto-sec sm:flex-row sm:flex-wrap sm:gap-x-6">
              {situacao && (
                <p className="inline-flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${situacao.aberto ? "bg-ouro" : "bg-texto-disc"}`}
                    aria-hidden
                  />
                  <span className={situacao.aberto ? "text-texto" : undefined}>{situacao.texto}</span>
                </p>
              )}
              {local && (
                <p className="inline-flex items-start gap-2">
                  <MapPin className="mt-1 size-4 shrink-0 text-texto-disc" aria-hidden />
                  {local}
                </p>
              )}
            </div>
          </div>

          <div data-anima className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <a href="#agendar" className={classesBotao("primario", "lg")}>
              <CalendarDays aria-hidden />
              Agendar horário
            </a>
            {barbearia.whatsapp && (
              <a
                href={linkWhatsapp(barbearia.whatsapp, `Olá, ${barbearia.nome}! Vim pelo link de agendamento.`)}
                target="_blank"
                rel="noopener noreferrer"
                className={classesBotao("contorno", "lg")}
              >
                <MessageCircle aria-hidden />
                Falar no WhatsApp
              </a>
            )}
          </div>
        </header>

        {barbearia.fotos.length > 0 && <Fotos fotos={barbearia.fotos} nome={barbearia.nome} />}
      </Revelar>

      <section id="agendar" aria-labelledby="titulo-agendar" className="scroll-mt-4 border-t border-borda bg-superficie">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16 lg:py-20">
          <div className="min-w-0">
            <h2 id="titulo-agendar" className="font-titulo text-[1.75rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2rem]">
              Agendar horário
            </h2>
            <p className="mt-2 max-w-[52ch] text-texto-sec">
              Escolha o serviço, o barbeiro e um horário livre. Leva menos de um minuto e não precisa criar conta.
            </p>
            <div className="mt-8">
              {servicos.length ? (
                <FluxoAgendamento
                  slug={barbearia.slug}
                  nomeBarbearia={barbearia.nome}
                  servicos={servicos}
                  barbeiros={barbeiros}
                  funcionamento={funcionamento}
                  regras={barbearia.regras}
                  agora={agora.toISOString()}
                />
              ) : (
                <p className="rounded-md border border-borda bg-card p-6 text-texto-sec">
                  Esta barbearia ainda não abriu horários pelo link. {barbearia.whatsapp ? "Fale com ela pelo WhatsApp." : ""}
                </p>
              )}
            </div>
          </div>

          <Informacoes barbearia={barbearia} funcionamento={funcionamento} agora={agora} />
        </div>
      </section>
    </main>
  );
}

function iniciais(nome: string) {
  const palavras = nome
    .replace(/\[[^\]]*\]/g, "")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !["barbearia", "barber", "barbershop"].includes(p.toLowerCase()));
  return (palavras.length ? palavras : [nome]).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

function Logo({ barbearia }: { barbearia: Barbearia }) {
  if (barbearia.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo vem de URL livre cadastrada pela barbearia
      <img src={barbearia.logoUrl} alt={`Logo da ${barbearia.nome}`} className="size-16 rounded-md object-cover sm:size-20" />
    );
  }
  return (
    <span
      className="inline-flex size-16 items-center justify-center rounded-md border border-ouro-discreto font-titulo text-[1.5rem] font-bold tracking-[-0.02em] text-ouro sm:size-20 sm:text-[1.875rem]"
      aria-hidden
    >
      {iniciais(barbearia.nome)}
    </span>
  );
}

function Fotos({ fotos, nome }: { fotos: string[]; nome: string }) {
  return (
    <ul
      data-anima
      className="-mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
      aria-label={`Fotos da ${nome}`}
    >
      {fotos.slice(0, 8).map((url, i) => (
        <li key={url} className="w-[72vw] max-w-80 shrink-0 snap-start sm:w-[44vw] lg:w-auto lg:max-w-none">
          {/* eslint-disable-next-line @next/next/no-img-element -- fotos vêm de URLs livres cadastradas pela barbearia */}
          <img
            src={url}
            alt={`Foto ${i + 1} da ${nome}`}
            loading={i < 2 ? "eager" : "lazy"}
            className="aspect-[4/5] w-full rounded-md border border-borda object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
