import { ArrowRight, Check, LogIn } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { LogoCompleta, Marca } from "@/components/marca";
import { LinkBotao, classesBotao } from "@/components/ui/botao";
import { GradeHorarios } from "@/components/vitrine/grade-horarios";
import { HeroAnimado } from "@/components/vitrine/hero-animado";

const PASSOS = [
  {
    titulo: "Coloque o link onde o cliente já está",
    texto: "Na bio do Instagram, num QR Code no balcão ou na resposta do WhatsApp. Cada barbearia tem o seu endereço.",
  },
  {
    titulo: "O cliente escolhe um horário livre",
    texto:
      "Serviço, barbeiro (ou qualquer um disponível) e o horário. Só aparece o que cabe de verdade: duração do serviço, almoço, folgas e bloqueios.",
  },
  {
    titulo: "Você acompanha tudo no painel",
    texto: "A agenda de cada barbeiro em um lugar, com confirmação, faltas e um lembrete pronto para mandar no WhatsApp.",
  },
];

const VANTAGENS = ["Grátis, sem cartão", "Pronto em uns 5 minutos", "Você mesmo cadastra tudo"];

export default function PaginaInicial() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <Marca />
        <nav className="flex items-center gap-2" aria-label="Acesso">
          <LinkBotao href="/login" variante="fantasma" icone={<LogIn aria-hidden />}>
            Entrar
          </LinkBotao>
          <LinkBotao href="/cadastro" variante="secundario" className="max-sm:hidden">
            Cadastrar barbearia
          </LinkBotao>
        </nav>
      </header>

      <main className="flex-1">
        <HeroAnimado className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-16 lg:pb-32 lg:pt-20">
          <div>
            <h1 className="font-titulo text-display font-bold" data-anima>
              Seu cliente marca.
              <br />
              Você corta.
            </h1>
            <p className="mt-8 max-w-[52ch] text-[1.0625rem] leading-relaxed text-texto-sec sm:text-lg" data-hero-texto data-anima>
              Vai de Corte é o link de agendamento da sua barbearia. O cliente escolhe serviço, barbeiro e horário sem
              mandar mensagem, e a agenda de cada barbeiro aparece organizada no seu painel.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row" data-hero-texto data-anima>
              <LinkBotao href="/cadastro" tamanho="lg" icone={<ArrowRight aria-hidden />}>
                Cadastrar minha barbearia
              </LinkBotao>
              <a href="#como-funciona" className={classesBotao("contorno", "lg")}>
                Ver como funciona
              </a>
            </div>
          </div>

          <div className="lg:justify-self-end lg:w-full lg:max-w-md" data-hero-grade data-anima>
            <GradeHorarios />
          </div>
        </HeroAnimado>

        <section id="como-funciona" className="border-t border-borda bg-superficie">
          <Revelar
            aoRolar
            className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-28"
          >
            <div data-anima>
              <h2 className="font-titulo text-[1.75rem] font-bold leading-tight sm:text-[2.25rem]">Como funciona</h2>
              <p className="mt-4 max-w-[40ch] text-texto-sec">
                Três passos entre o cliente ver o seu link e o horário aparecer na agenda do barbeiro.
              </p>
            </div>
            <ol className="flex flex-col">
              {PASSOS.map((passo, i) => (
                <li
                  key={passo.titulo}
                  data-anima
                  className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-borda py-7 first:border-t-0 first:pt-0 sm:grid-cols-[3.5rem_1fr]"
                >
                  <span className="numeros font-titulo text-[1.75rem] font-bold leading-none text-ouro sm:text-[2.25rem]" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-titulo text-subtitulo font-semibold sm:text-[1.25rem]">{passo.titulo}</h3>
                    <p className="mt-2 max-w-[56ch] text-texto-sec">{passo.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Revelar>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-8 lg:py-28">
          <Revelar aoRolar className="grid gap-6 md:grid-cols-2">
            <div data-anima className="rounded-lg border border-borda bg-card p-6 sm:p-8">
              <h2 className="font-titulo text-secao font-semibold">Agenda separada por barbeiro</h2>
              <p className="mt-3 text-texto-sec">
                O mesmo horário pode estar livre com um barbeiro e ocupado com outro. Ninguém marca duas vezes no mesmo
                horário: o sistema confere antes de confirmar.
              </p>
            </div>
            <div data-anima className="rounded-lg border border-borda bg-card p-6 sm:p-8">
              <h2 className="font-titulo text-secao font-semibold">WhatsApp sem robô</h2>
              <p className="mt-3 text-texto-sec">
                Confirmação e lembrete abrem o WhatsApp com a mensagem já escrita. Você envia do seu número, do seu jeito.
              </p>
            </div>
          </Revelar>
        </section>
        <section className="border-t border-borda bg-superficie">
          <Revelar
            aoRolar
            className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-24"
          >
            <div>
              <h2 className="font-titulo text-[1.75rem] font-bold leading-tight sm:text-[2.25rem]" data-anima>
                Sua barbearia com link próprio hoje.
              </h2>
              <ul className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-8" data-anima>
                {VANTAGENS.map((v) => (
                  <li key={v} className="flex items-center gap-2 text-texto-sec">
                    <Check className="size-4 shrink-0 text-ouro" aria-hidden />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
            <div data-anima>
              <LinkBotao href="/cadastro" tamanho="lg" className="w-full sm:w-auto" icone={<ArrowRight aria-hidden />}>
                Cadastrar minha barbearia
              </LinkBotao>
            </div>
          </Revelar>
        </section>
      </main>

      <footer className="border-t border-borda">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div>
            <LogoCompleta className="h-28 w-auto" />
            <p className="mt-3 max-w-[48ch] text-label text-texto-disc">
              Feito pelo time Programadores da Fiel para o Startup Challenge UMC 2026.
            </p>
          </div>
          <LinkBotao href="/login" variante="contorno">
            Área do barbeiro
          </LinkBotao>
        </div>
      </footer>
    </div>
  );
}
