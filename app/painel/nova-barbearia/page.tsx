import type { Metadata } from "next";
import { Suspense } from "react";
import { obterContextoPainel } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { CarregandoCadastro } from "../_componentes/so-dono";
import { Assistente } from "./_componentes/assistente";

export const metadata: Metadata = { title: "Cadastrar barbearia" };

export default function PaginaNovaBarbearia() {
  return (
    <Suspense fallback={<CarregandoCadastro rotulo="Carregando cadastro" />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const { usuario, vinculos } = await obterContextoPainel();
  const supabase = await criarClienteServidor();
  const { data: perfil } = await supabase.from("perfis").select("nome").eq("id", usuario.id).maybeSingle<{ nome: string | null }>();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-label text-texto-sec">{vinculos.length ? "Mais uma barbearia" : "Boas-vindas ao Vai de Corte"}</p>
        <h1 className="mt-1 font-titulo text-[1.625rem] font-bold leading-tight tracking-[-0.02em] sm:text-titulo">
          Cadastre a sua barbearia
        </h1>
        <p className="mt-2 max-w-[60ch] text-texto-sec">
          Quatro passos rápidos. No fim, o seu link de agendamento já funciona. Fotos, logo, almoço e folgas você ajusta
          depois, com calma.
        </p>
      </header>
      <Assistente nomeDono={perfil?.nome ?? ""} />
    </div>
  );
}
