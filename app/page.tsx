import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, LogIn } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { LogoCompleta, Marca } from "@/components/marca";
import { LinkBotao, classesBotao } from "@/components/ui/botao";
import { Aberta24h } from "@/components/vitrine/aberta-24h";
import { BarraEtapas, type Etapa } from "@/components/vitrine/barra-etapas";
import { GradeHorarios } from "@/components/vitrine/grade-horarios";
import { HeroRolo, type Quadro } from "@/components/vitrine/hero-rolo";
import { VideoLoop } from "@/components/vitrine/video-loop";
import fotoCadeiras from "@/public/vitrine/cadeiras.jpg";
import fotoFerramentas from "@/public/vitrine/ferramentas.jpg";
import posterMaquina from "@/public/vitrine/maquina-poster.jpg";
import posterNavalha from "@/public/vitrine/navalha-poster.jpg";
import fotoCadeiraDetalhe from "@/public/vitrine/cadeira-detalhe.jpg";

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
    legenda: "Cadeiras prontas para o próximo cliente.",
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

// Recursos do painel, cada um com uma foto da barbearia.
const RECURSOS = [
  {
    foto: posterMaquina,
    alt: "Barbeiro passando a máquina na nuca do cliente",
    titulo: "Agenda de cada barbeiro",
    texto: "O dia separado por barbeiro. Confirmar, concluir, cancelar ou marcar falta com um toque.",
  },
  {
    foto: fotoFerramentas,
    alt: "Pincel, navalhas e pentes de máquina na bancada",
    titulo: "Sem horário duplicado",
    texto: "O sistema confere antes de confirmar. Dois clientes nunca caem no mesmo horário do mesmo barbeiro.",
  },
  {
    foto: posterNavalha,
    alt: "Mãos abrindo uma navalha dourada",
    titulo: "Lembrete pelo WhatsApp",
    texto: "Um botão abre o WhatsApp do cliente com a mensagem pronta. Sai do seu número, do seu jeito.",
  },
  {
    foto: fotoCadeiraDetalhe,
    alt: "Cadeira de barbeiro antiga com braços cromados",
    titulo: "Quanto cada um faturou",
    texto: "Atendimentos, faltas, serviços mais pedidos e o faturado do mês de cada barbeiro.",
  },
];

const EXTRAS = [
  "Aviso no celular quando entra horário novo",
  "Botão de Google Agenda para o cliente",
  "Página da barbearia com fotos, serviços e preços",
  "Bloqueio de horário e agendamento manual",
];

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

        <Aberta24h foto={fotoCadeiras} alt="Salão de barbearia vazio, com cadeiras antigas em fila e piso xadrez" />

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

        <section id="recursos" aria-labelledby="titulo-recursos" className="scroll-mt-4 bg-superficie">
          <Revelar aoRolar className="mx-auto w-full max-w-[1600px] px-4 py-24 sm:px-8 lg:py-40">
            <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
              <h2
                id="titulo-recursos"
                data-anima
                className="font-titulo text-[clamp(2.25rem,5.2vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.04em]"
              >
                O que vem no painel.
              </h2>
              <p data-anima className="max-w-[46ch] text-[1.0625rem] leading-relaxed text-texto lg:justify-self-end">
                Tudo o que o barbeiro precisa para o dia, sem planilha e sem caderno.
              </p>
            </div>

            <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:mt-20 lg:grid-cols-4">
              {RECURSOS.map((r) => (
                <li key={r.titulo} data-anima className="group">
                  <div className="aspect-[4/5] overflow-hidden rounded-sm bg-card">
                    <Image
                      src={r.foto}
                      alt={r.alt}
                      sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 100vw"
                      placeholder="blur"
                      className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    />
                  </div>
                  <h3 className="mt-4 font-titulo text-[1.0625rem] font-semibold leading-tight sm:mt-5 sm:text-[1.375rem]">{r.titulo}</h3>
                  <p className="mt-2 max-w-[36ch] text-base leading-relaxed text-texto-sec">{r.texto}</p>
                </li>
              ))}
            </ul>

            <div data-anima className="mt-16 flex flex-col gap-8 rounded-md bg-card p-6 sm:p-8 lg:mt-20 lg:flex-row lg:items-center lg:justify-between">
              <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
                {EXTRAS.map((e) => (
                  <li key={e} className="flex items-start gap-2.5 text-base text-texto">
                    <Check className="mt-1 size-4 shrink-0 text-ouro" aria-hidden />
                    {e}
                  </li>
                ))}
              </ul>
              <LinkBotao href="/cadastro" tamanho="lg" className="shrink-0" icone={<ArrowRight aria-hidden />}>
                Criar o link da barbearia
              </LinkBotao>
            </div>
          </Revelar>
        </section>

        <section aria-labelledby="titulo-chamada" className="bg-ouro text-sobre-ouro">
          <Revelar
            aoRolar
            className="mx-auto flex w-full max-w-[1600px] flex-col justify-between gap-12 px-4 py-20 sm:px-8 lg:gap-20 lg:py-28"
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

      <footer>
        <Revelar
          aoRolar
          className="mx-auto grid w-full max-w-[1600px] gap-12 px-4 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:py-20"
        >
          <div data-anima className="sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label="Vai de Corte, página inicial" className="inline-flex">
              <LogoCompleta className="h-24 w-auto" />
            </Link>
            <p className="mt-5 max-w-[36ch] text-base text-texto-sec">
              Agendamento online para barbearias. O cliente marca pelo link e você corta.
            </p>
          </div>
          <nav data-anima aria-label="Página inicial">
            <h2 className="font-titulo text-subtitulo font-semibold">Conheça</h2>
            <ul className="mt-4 flex flex-col gap-3 text-base">
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
              <li>
                <a href="#recursos" className="text-texto-sec transition-colors hover:text-ouro">
                  O que vem no painel
                </a>
              </li>
            </ul>
          </nav>
          <nav data-anima aria-label="Acesso">
            <h2 className="font-titulo text-subtitulo font-semibold">Para a barbearia</h2>
            <ul className="mt-4 flex flex-col gap-3 text-base">
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
            </ul>
          </nav>
        </Revelar>
        <div className="bg-superficie">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-6 text-label text-texto-disc sm:flex-row sm:justify-between sm:px-8">
            <p>© 2026 Vai de Corte</p>
            <p>Feito pelo time Programadores da Fiel para o Startup Challenge UMC 2026.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
