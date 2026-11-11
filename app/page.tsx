import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { Marca } from "@/components/marca";
import { LinkBotao, classesBotao } from "@/components/ui/botao";
import { BarraEtapas, type Etapa } from "@/components/vitrine/barra-etapas";
import { GradeHorarios } from "@/components/vitrine/grade-horarios";
import { HeroRolo, type Quadro } from "@/components/vitrine/hero-rolo";
import { VideoLoop } from "@/components/vitrine/video-loop";
import { ZoomBarbearia } from "@/components/vitrine/zoom-barbearia";
import fotoCadeiras from "@/public/vitrine/cadeiras.jpg";
import fotoFerramentas from "@/public/vitrine/ferramentas.jpg";
import posterMaquina from "@/public/vitrine/maquina-poster.jpg";
import posterNavalha from "@/public/vitrine/navalha-poster.jpg";

// Rolo do topo: vídeos e fotos de barbearia que passam por dentro da frase.
const QUADROS: Quadro[] = [
  {
    tipo: "video",
    src: "/vitrine/maquina.mp4",
    poster: "/vitrine/maquina-poster.jpg",
    srcCelular: "/vitrine/tesouras-vertical.mp4",
    posterCelular: "/vitrine/tesouras-vertical-poster.jpg",
    legenda: "Máquina na nuca, no horário que o cliente escolheu.",
  },
  {
    tipo: "video",
    src: "/vitrine/navalha.mp4",
    poster: "/vitrine/navalha-poster.jpg",
    legenda: "Navalha pronta para a barba das três.",
  },
  {
    tipo: "foto",
    foto: fotoFerramentas,
    alt: "Pincel, navalhas e pentes de máquina sobre a bancada",
    legenda: "Pincel, navalha e pentes esperando o próximo.",
  },
  {
    tipo: "foto",
    foto: fotoCadeiras,
    alt: "Cadeiras de barbeiro antigas em fila num salão de piso xadrez",
    legenda: "Cadeira livre só fica livre se ninguém souber.",
  },
];

const ETAPAS: Etapa[] = [
  { duracao: "Uns 5 minutos", texto: "Primeiro, você cadastra a barbearia, os serviços e os barbeiros.", peso: 2, cor: "elevado" },
  { duracao: "Menos de 1 minuto", texto: "Depois, o cliente abre o seu link e escolhe um horário livre.", peso: 2, cor: "ouro-discreto" },
  {
    duracao: "O dia inteiro",
    texto: "E a agenda de cada barbeiro vai se enchendo no painel, sem você parar o corte para responder.",
    peso: 5,
    cor: "ouro",
  },
];

/** Recorte de foto do tamanho de uma palavra, dentro do parágrafo de recursos. */
function FotoPalavra({ src, alt, posicao = "50% 50%" }: { src: typeof fotoCadeiras; alt: string; posicao?: string }) {
  return (
    <span className="relative mx-[0.12em] inline-block h-[1em] w-[1.5em] translate-y-[0.12em] overflow-hidden rounded-[0.18em] align-baseline sm:w-[1.9em]">
      <Image src={src} alt={alt} fill sizes="120px" className="object-cover" style={{ objectPosition: posicao }} />
    </span>
  );
}

export default function PaginaInicial() {
  return (
    <div className="flex flex-1 flex-col">
      <HeroRolo
        quadros={QUADROS}
        cabecalho={
          <header className="flex items-center justify-between gap-4 py-5">
            <Link href="/" aria-label="Vai de Corte, página inicial" className="inline-flex">
              <Marca />
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
              <a href="#como-funciona" className={classesBotao("fantasma", "md", "max-lg:hidden")}>
                Como funciona
              </a>
              <a href="#recursos" className={classesBotao("fantasma", "md", "max-lg:hidden")}>
                Recursos
              </a>
              <LinkBotao href="/login" variante="fantasma" icone={<LogIn aria-hidden />}>
                Entrar
              </LinkBotao>
              <LinkBotao href="/cadastro" className="max-sm:hidden">
                Cadastrar barbearia
              </LinkBotao>
            </nav>
          </header>
        }
        antes={
          <>
            Seu cliente <span className="lg:block">marca.</span>
          </>
        }
        depois={
          <>
            Você <span className="lg:block">corta.</span>
          </>
        }
        apoio={
          <>
            <p className="max-w-[46ch] text-[1.0625rem] leading-relaxed text-texto sm:text-lg">
              Vai de Corte é o link de agendamento da sua barbearia. O cliente escolhe serviço, barbeiro e horário sem
              mandar mensagem. Grátis.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <LinkBotao href="/cadastro" tamanho="lg" icone={<ArrowRight aria-hidden />}>
                Cadastrar minha barbearia
              </LinkBotao>
              <a href="#teste" className={classesBotao("contorno", "lg", "max-sm:hidden")}>
                Testar como cliente
              </a>
            </div>
          </>
        }
      />

      <main className="flex-1">
        <section id="como-funciona" aria-labelledby="titulo-como" className="scroll-mt-4 bg-superficie">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-24 sm:px-8 lg:py-40">
            <Revelar aoRolar>
              <h2
                id="titulo-como"
                data-anima
                className="font-titulo text-[clamp(2.5rem,7vw,6.5rem)] font-bold leading-[0.95] tracking-[-0.04em]"
              >
                Do link à cadeira.
              </h2>
            </Revelar>
            <div className="mt-12 lg:mt-16">
              <BarraEtapas etapas={ETAPAS} />
            </div>
          </div>
        </section>

        <ZoomBarbearia
          foto={fotoCadeiras}
          alt="Salão de barbearia com cadeiras antigas em fila e piso xadrez"
          antes="Sua barbearia"
          depois="aberta 24 horas."
          legenda="O link aceita horário de madrugada, no domingo e no meio de um corte. Você só abre a agenda e vê quem vem."
        />

        <section id="teste" aria-labelledby="titulo-teste" className="scroll-mt-4 bg-superficie">
          <Revelar
            aoRolar
            className="mx-auto grid w-full max-w-[1600px] items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-20 lg:py-40"
          >
            <div>
              <h2
                id="titulo-teste"
                data-anima
                className="font-titulo text-[clamp(2.25rem,5.2vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.04em]"
              >
                Marque um horário aqui.
              </h2>
              <p data-anima className="mt-6 max-w-[48ch] text-[1.0625rem] leading-relaxed text-texto">
                É a tela que o cliente vê no seu link. Só aparece horário que cabe de verdade: duração do serviço, almoço,
                folgas e bloqueios já ficam de fora.
              </p>
              <div data-anima className="mt-10 max-w-md">
                <GradeHorarios />
              </div>
            </div>
            <div data-anima className="relative aspect-[9/14] w-full overflow-hidden rounded-sm bg-card max-lg:hidden">
              <VideoLoop src="/vitrine/tesouras-vertical.mp4" poster="/vitrine/tesouras-vertical-poster.jpg" />
            </div>
          </Revelar>
        </section>

        <section id="recursos" aria-labelledby="titulo-recursos" className="scroll-mt-4">
          <h2 id="titulo-recursos" className="sr-only">
            O que vem no painel
          </h2>
          <Revelar aoRolar className="mx-auto w-full max-w-[1600px] px-4 py-24 sm:px-8 lg:py-40">
            <p
              data-anima
              className="max-w-[60rem] font-titulo text-[clamp(1.5rem,5.6vw,2rem)] font-semibold leading-[1.25] tracking-[-0.02em] lg:max-w-[64rem]"
            >
              Cada barbeiro tem a sua agenda
              <FotoPalavra src={posterMaquina} alt="Barbeiro passando a máquina" posicao="40% 30%" />, ninguém marca
              duas vezes no mesmo horário
              <span
                className="mx-[0.12em] inline-flex h-[1em] translate-y-[0.12em] items-center rounded-[0.18em] bg-superficie px-[0.3em] align-baseline text-[0.5em] font-medium tracking-normal text-texto-disc line-through"
                data-ui
              >
                10:30 ocupado
              </span>
              , o lembrete sai pelo seu WhatsApp
              <FotoPalavra src={posterNavalha} alt="Mãos abrindo uma navalha dourada" posicao="50% 45%" />e o painel
              mostra quanto cada um faturou
              <FotoPalavra src={fotoFerramentas} alt="Ferramentas de barbeiro na bancada" posicao="30% 40%" />.
            </p>
            <div data-anima className="mt-16 grid lg:mt-20 lg:grid-cols-2">
              <div className="lg:col-start-2">
                <p className="max-w-[44ch] text-lg leading-relaxed text-texto">
                  Tem ainda aviso no celular quando entra horário novo, Google Agenda para o cliente e a sua página com
                  fotos, serviços e preços.
                </p>
                <LinkBotao href="/cadastro" tamanho="lg" className="mt-8" icone={<ArrowRight aria-hidden />}>
                  Criar o link da barbearia
                </LinkBotao>
              </div>
            </div>
          </Revelar>
        </section>

        <section aria-labelledby="titulo-chamada" className="bg-ouro text-sobre-ouro">
          <Revelar
            aoRolar
            className="mx-auto flex min-h-[80svh] w-full max-w-[1600px] flex-col justify-between gap-16 px-4 py-20 sm:px-8 lg:min-h-[90svh] lg:py-24"
          >
            <h2
              id="titulo-chamada"
              data-anima
              className="font-titulo text-[clamp(2rem,8vw,7.5rem)] font-bold leading-[0.92] tracking-[-0.045em]"
            >
              Menos mensagem.
              <br />
              Mais cadeira cheia.
            </h2>
            <div data-anima className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <p className="max-w-[40ch] text-lg leading-relaxed sm:text-xl">
                Grátis e sem cartão. Você mesmo cadastra tudo em uns 5 minutos e já sai com o link.
              </p>
              <Link
                href="/cadastro"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-sm bg-fundo px-7 text-[1.0625rem] font-semibold text-ouro transition-[background-color,transform] duration-150 hover:bg-superficie active:scale-[0.98] [&_svg]:size-5 [&_svg]:transition-transform hover:[&_svg]:translate-x-1"
              >
                Cadastrar minha barbearia
                <ArrowRight aria-hidden />
              </Link>
            </div>
          </Revelar>
        </section>
      </main>

      <footer className="relative overflow-hidden">
        <Revelar aoRolar className="mx-auto w-full max-w-[1600px] px-4 pt-24 sm:px-8 lg:pt-32">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7" data-anima>
              <h2 className="font-titulo text-[clamp(2rem,5vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.04em]">
                Já tem conta?
                <br />
                Abra a sua agenda.
              </h2>
              <LinkBotao href="/login" variante="contorno" tamanho="lg" className="mt-8">
                Área do barbeiro
              </LinkBotao>
            </div>
            <ul className="flex flex-col gap-3 text-base lg:col-span-3 lg:col-start-10" data-anima>
              <li>
                <Link href="/cadastro" className="text-texto-sec transition-colors hover:text-ouro">
                  Cadastrar barbearia
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-texto-sec transition-colors hover:text-ouro">
                  Entrar no painel
                </Link>
              </li>
              <li>
                <a href="#como-funciona" className="text-texto-sec transition-colors hover:text-ouro">
                  Como funciona
                </a>
              </li>
              <li>
                <a href="#teste" className="text-texto-sec transition-colors hover:text-ouro">
                  Testar como cliente
                </a>
              </li>
            </ul>
          </div>
          <p className="mt-20 text-label text-texto-disc lg:mt-28">
            Feito pelo time Programadores da Fiel para o Startup Challenge UMC 2026.
          </p>
        </Revelar>
        <div className="mx-auto mt-6 w-full max-w-[1600px] px-4 sm:px-8" aria-hidden>
          <Image
            src="/marca/logo-horizontal.png"
            alt=""
            width={1401}
            height={144}
            sizes="140vw"
            className="h-auto w-[135%] max-w-none translate-y-[28%] opacity-90"
          />
        </div>
      </footer>
    </div>
  );
}
