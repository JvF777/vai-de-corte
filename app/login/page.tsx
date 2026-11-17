import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Revelar } from "@/components/animacao/revelar";
import { Marca } from "@/components/marca";
import { metadataApp } from "@/lib/app-instalavel";
import { AvisoRetorno } from "./aviso-retorno";
import { FormularioLogin } from "./formulario-login";
import { TituloNavalha } from "./_componentes/titulo-navalha";
import { VideoCorte } from "./_componentes/video-corte";

export const metadata: Metadata = { title: "Entrar", ...metadataApp };

export default function PaginaLogin() {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <aside className="lg:order-2" aria-label="Vídeo de um corte de cabelo na barbearia">
        <VideoCorte />
      </aside>

      <main className="flex flex-1 flex-col px-4 pb-8 pt-6 sm:px-8 lg:order-1 lg:min-h-svh">
        <Link href="/" className="hidden self-start rounded-sm lg:block" aria-label="Vai de Corte, página inicial">
          <Marca />
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-6 lg:py-12">
          <TituloNavalha>Entrar no painel</TituloNavalha>
          <Revelar atraso={0.15}>
            <p className="mt-3 text-texto-sec" data-anima>
              Para donos e barbeiros. O cliente agenda pelo link da barbearia, sem login.
            </p>
            <div className="mt-8" data-anima>
              <Suspense fallback={null}>
                <AvisoRetorno />
              </Suspense>
              <FormularioLogin />
            </div>
            <p className="mt-8 text-label text-texto-sec" data-anima>
              Dono de barbearia e ainda não tem conta?{" "}
              <Link href="/cadastro" className="text-ouro-hover underline underline-offset-4 hover:text-ouro">
                Cadastre a sua grátis
              </Link>
            </p>
            <p className="mt-2 text-label text-texto-disc" data-anima>
              Barbeiro de uma equipe? Peça ao dono para liberar o seu e-mail.
            </p>
          </Revelar>
        </div>
      </main>
    </div>
  );
}
