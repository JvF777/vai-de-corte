import { Suspense } from "react";
import type { Metadata } from "next";
import { carregarCadastro, obterAcesso } from "@/lib/painel/dados";
import { Aviso } from "@/components/ui/aviso";
import { CarregandoCadastro, SoDono } from "../_componentes/so-dono";
import { EdicaoBarbearia } from "./_componentes/edicao-barbearia";

export const metadata: Metadata = { title: "Barbearia" };

export default function PaginaBarbearia() {
  return (
    <Suspense fallback={<CarregandoCadastro rotulo="Carregando dados da barbearia" />}>
      <Barbearia />
    </Suspense>
  );
}

async function Barbearia() {
  const acesso = await obterAcesso();
  if (!acesso) return <Aviso tipo="atencao">Seu usuário ainda não está ligado a nenhuma barbearia.</Aviso>;
  if (!acesso.ehDono) return <SoDono titulo="Barbearia" />;
  const { barbearia, funcionamento } = await carregarCadastro(acesso.atual.barbeariaId);
  return <EdicaoBarbearia barbearia={barbearia} funcionamento={funcionamento} />;
}
