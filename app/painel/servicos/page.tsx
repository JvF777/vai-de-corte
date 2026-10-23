import { Suspense } from "react";
import type { Metadata } from "next";
import { carregarCadastro, obterAcesso } from "@/lib/painel/dados";
import { Aviso } from "@/components/ui/aviso";
import { CarregandoCadastro, SoDono } from "../_componentes/so-dono";
import { ListaServicos } from "./_componentes/lista-servicos";

export const metadata: Metadata = { title: "Serviços" };

export default function PaginaServicos() {
  return (
    <Suspense fallback={<CarregandoCadastro rotulo="Carregando serviços" />}>
      <Servicos />
    </Suspense>
  );
}

async function Servicos() {
  const acesso = await obterAcesso();
  if (!acesso) return <Aviso tipo="atencao">Seu usuário ainda não está ligado a nenhuma barbearia.</Aviso>;
  if (!acesso.ehDono) return <SoDono titulo="Serviços" />;

  const { servicos, barbeiros } = await carregarCadastro(acesso.atual.barbeariaId);
  return (
    <ListaServicos
      servicos={servicos}
      barbeiros={barbeiros.map((b) => ({ id: b.id, nome: b.nome, ativo: b.ativo, servicoIds: b.servicoIds }))}
    />
  );
}
