import { Suspense } from "react";
import type { Metadata } from "next";
import { carregarCadastro, obterAcesso } from "@/lib/painel/dados";
import { Aviso } from "@/components/ui/aviso";
import { CarregandoCadastro, SoDono } from "../_componentes/so-dono";
import { ListaBarbeiros } from "./_componentes/lista-barbeiros";

export const metadata: Metadata = { title: "Barbeiros" };

export default function PaginaBarbeiros() {
  return (
    <Suspense fallback={<CarregandoCadastro rotulo="Carregando barbeiros" />}>
      <Barbeiros />
    </Suspense>
  );
}

async function Barbeiros() {
  const acesso = await obterAcesso();
  if (!acesso) return <Aviso tipo="atencao">Seu usuário ainda não está ligado a nenhuma barbearia.</Aviso>;
  if (!acesso.ehDono) return <SoDono titulo="Barbeiros" />;
  const { barbeiros, servicos } = await carregarCadastro(acesso.atual.barbeariaId);
  return <ListaBarbeiros barbeiros={barbeiros} totalServicos={servicos.filter((s) => s.ativo).length} />;
}
