import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { carregarCadastro, carregarFolgas, obterAcesso } from "@/lib/painel/dados";
import { Aviso } from "@/components/ui/aviso";
import { CarregandoCadastro, SoDono } from "../../_componentes/so-dono";
import { EdicaoBarbeiro } from "./_componentes/edicao-barbeiro";

export const metadata: Metadata = { title: "Barbeiro" };

export default function PaginaBarbeiro({ params, searchParams }: PageProps<"/painel/barbeiros/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/painel/barbeiros" className="inline-flex min-h-11 w-fit items-center gap-1 text-texto-sec hover:text-texto">
        <ChevronLeft className="size-5" aria-hidden />
        Barbeiros
      </Link>
      <Suspense fallback={<CarregandoCadastro rotulo="Carregando barbeiro" />}>
        <Barbeiro params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Barbeiro({ params, searchParams }: PageProps<"/painel/barbeiros/[id]">) {
  const acesso = await obterAcesso();
  if (!acesso) return <Aviso tipo="atencao">Seu usuário ainda não está ligado a nenhuma barbearia.</Aviso>;
  if (!acesso.ehDono) return <SoDono titulo="Barbeiro" />;

  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const cadastro = await carregarCadastro(acesso.atual.barbeariaId);
  const barbeiro = cadastro.barbeiros.find((b) => b.id === id);
  if (!barbeiro) notFound();
  const folgas = await carregarFolgas(acesso.atual.barbeariaId, id);
  const { novo } = await searchParams;

  return (
    <EdicaoBarbeiro
      barbeiro={barbeiro}
      servicos={cadastro.servicos}
      funcionamento={cadastro.funcionamento}
      folgas={folgas}
      recemCriado={novo === "1"}
    />
  );
}
