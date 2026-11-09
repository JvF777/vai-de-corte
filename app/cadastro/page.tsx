import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Link2, Scissors } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { Marca } from "@/components/marca";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = {
  title: "Cadastrar barbearia",
  description: "Crie a conta da sua barbearia no Vai de Corte e receba o seu link de agendamento.",
};

const ETAPAS = [
  { Icone: Scissors, titulo: "Conte como é a barbearia", texto: "Nome, horários, serviços com preço e quem atende." },
  { Icone: Link2, titulo: "Receba o seu link", texto: "Coloque na bio do Instagram, no WhatsApp e no QR Code do balcão." },
  { Icone: CalendarCheck, titulo: "O cliente marca sozinho", texto: "E o horário aparece na agenda do barbeiro, no painel." },
];

export default function PaginaCadastro() {
  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <Link href="/" className="self-start rounded-sm" aria-label="Vai de Corte, página inicial">
          <Marca />
        </Link>

        <Revelar className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <p className="text-label font-medium uppercase tracking-[0.14em] text-ouro" data-anima>
            Grátis para barbearias
          </p>
          <h1 className="mt-2 font-titulo text-titulo font-bold" data-anima>
            Cadastre a sua barbearia
          </h1>
          <p className="mt-2 text-texto-sec" data-anima>
            Leva uns 5 minutos. Primeiro a sua conta, depois os dados da barbearia.
          </p>
          <div className="relative mt-8" data-anima>
            <FormularioCadastro />
          </div>
          <p className="mt-8 text-label text-texto-sec" data-anima>
            Já tem conta?{" "}
            <Link href="/login" className="text-ouro-hover underline underline-offset-4 hover:text-ouro">
              Entrar
            </Link>
          </p>
        </Revelar>
      </main>

      <aside className="hidden flex-col justify-center border-l border-borda bg-superficie px-12 py-12 lg:flex xl:px-20">
        <p className="max-w-md font-titulo text-secao font-semibold">Do cadastro ao primeiro cliente marcando sozinho.</p>
        <ol className="mt-8 flex max-w-md flex-col">
          {ETAPAS.map(({ Icone, titulo, texto }, i) => (
            <li key={titulo} className="grid grid-cols-[2.75rem_1fr] gap-4 border-t border-borda py-6 first:border-t-0 first:pt-0">
              <span className="flex size-11 items-center justify-center rounded-full border border-ouro-discreto text-ouro">
                <Icone className="size-5" aria-hidden />
                <span className="sr-only">Passo {i + 1}</span>
              </span>
              <div>
                <p className="font-titulo text-subtitulo font-semibold">{titulo}</p>
                <p className="mt-1 text-texto-sec">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
