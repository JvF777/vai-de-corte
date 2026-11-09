import type { Metadata } from "next";
import Link from "next/link";
import { Revelar } from "@/components/animacao/revelar";
import { Marca } from "@/components/marca";
import { metadataApp } from "@/lib/app-instalavel";
import { GradeHorarios } from "@/components/vitrine/grade-horarios";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar", ...metadataApp };

export default function PaginaLogin() {
  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <Link href="/" className="self-start rounded-sm" aria-label="Vai de Corte, página inicial">
          <Marca />
        </Link>

        <Revelar className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="font-titulo text-titulo font-bold" data-anima>
            Entrar no painel
          </h1>
          <p className="mt-2 text-texto-sec" data-anima>
            Para donos e barbeiros. O cliente agenda pelo link da barbearia, sem login.
          </p>
          <div className="mt-8" data-anima>
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
      </main>

      <aside className="hidden flex-col justify-center gap-8 border-l border-borda bg-superficie px-12 py-12 lg:flex xl:px-20">
        <div className="max-w-md">
          <p className="font-titulo text-secao font-semibold">É isto que o seu cliente vê.</p>
          <p className="mt-2 text-texto-sec">Os horários livres de cada barbeiro, já descontando almoço, folgas e o que está marcado.</p>
        </div>
        <div className="max-w-md">
          <GradeHorarios />
        </div>
      </aside>
    </div>
  );
}
