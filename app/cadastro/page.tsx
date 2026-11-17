import type { Metadata } from "next";
import Link from "next/link";
import { Revelar } from "@/components/animacao/revelar";
import { Marca } from "@/components/marca";
import { TituloNavalha } from "../login/_componentes/titulo-navalha";
import { VideoCorte } from "../login/_componentes/video-corte";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = {
  title: "Cadastrar barbearia",
  description: "Crie a conta da sua barbearia no Vai de Corte e receba o seu link de agendamento.",
};

export default function PaginaCadastro() {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <aside className="lg:order-2" aria-label="Vídeo de um corte de cabelo na barbearia">
        <VideoCorte
          frase="Do cadastro ao primeiro cliente marcando sozinho."
          apoio="Você conta como é a barbearia, recebe o seu link e o horário aparece na agenda do barbeiro."
        />
      </aside>

      <main className="flex flex-1 flex-col px-4 pb-8 pt-6 sm:px-8 lg:order-1 lg:min-h-svh">
        <Link href="/" className="hidden self-start rounded-sm lg:block" aria-label="Vai de Corte, página inicial">
          <Marca />
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-6 lg:py-12">
          <TituloNavalha>Cadastre a sua barbearia</TituloNavalha>
          <Revelar atraso={0.15}>
            <p className="mt-3 text-texto-sec" data-anima>
              Grátis e sem cartão. Leva uns 5 minutos: primeiro a sua conta, depois os dados da barbearia.
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
        </div>
      </main>
    </div>
  );
}
