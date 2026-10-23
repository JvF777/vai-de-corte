"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, UserPlus } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { AreaTexto } from "@/components/ui/area-texto";
import { Avatar } from "@/components/ui/avatar";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Modal, RodapeModal } from "@/components/ui/modal";
import { Painel } from "@/components/ui/painel";
import { horaCurta } from "@/app/barbearia/[slug]/_componentes/funcionamento";
import { resumirDias } from "@/lib/painel/agenda";
import type { BarbeiroPainel } from "@/lib/painel/dados";
import { useFormulario } from "@/lib/painel/use-formulario";
import { criarBarbeiro } from "../actions";

/** "9h às 18h" quando todos os dias são iguais; senão "Varia por dia". */
function resumoHorario(b: BarbeiroPainel) {
  if (!b.jornadas.length) return "Sem horário";
  const chaves = new Set(b.jornadas.map((j) => `${j.inicio}-${j.fim}`));
  if (chaves.size > 1) return "Varia por dia";
  return `${horaCurta(b.jornadas[0].inicio)} às ${horaCurta(b.jornadas[0].fim)}`;
}

export function ListaBarbeiros({ barbeiros, totalServicos }: { barbeiros: BarbeiroPainel[]; totalServicos: number }) {
  const [novo, setNovo] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-titulo text-[1.625rem] font-bold leading-tight tracking-[-0.02em] sm:text-titulo">Barbeiros</h1>
          <p className="mt-1 max-w-xl text-texto-sec">Quem atende, em que dias e quais serviços faz. Cada um tem a própria agenda.</p>
        </div>
        <Botao icone={<Plus aria-hidden />} onClick={() => setNovo(true)}>
          Novo barbeiro
        </Botao>
      </header>

      {barbeiros.length === 0 ? (
        <Painel className="flex flex-col items-start gap-3 px-5 py-8">
          <p className="font-titulo text-subtitulo font-semibold">Ninguém na equipe ainda</p>
          <p className="text-texto-sec">Cadastre quem atende, mesmo que seja só você. O link de agendamento precisa de pelo menos um barbeiro.</p>
          <Botao icone={<UserPlus aria-hidden />} onClick={() => setNovo(true)}>
            Cadastrar barbeiro
          </Botao>
        </Painel>
      ) : (
        <Painel className="overflow-hidden">
          <table className="w-full text-left">
            <caption className="sr-only">Equipe da barbearia</caption>
            <thead className="hidden border-b border-borda text-label text-texto-sec sm:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Barbeiro
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Dias
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Horário
                </th>
                <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">
                  Serviços
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Abrir</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {barbeiros.map((b) => (
                <tr key={b.id} className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-3 px-5 py-4 transition-colors hover:bg-elevado sm:table-row sm:p-0">
                  <td className="sm:px-5 sm:py-3">
                    <div className="flex items-center gap-3">
                      <Avatar nome={b.nome} url={b.fotoUrl} />
                      <div className="hidden min-w-0 sm:block">
                        <Link href={`/painel/barbeiros/${b.id}`} className="font-medium after:absolute after:inset-0">
                          {b.nome}
                        </Link>
                        <p className="text-label text-texto-sec">{b.ativo ? (b.temLogin ? "Tem acesso ao painel" : "Sem acesso ao painel") : "Fora do link"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="min-w-0 sm:hidden">
                    <Link href={`/painel/barbeiros/${b.id}`} className="block truncate font-medium after:absolute after:inset-0">
                      {b.nome}
                    </Link>
                    <p className="truncate text-label text-texto-sec">
                      {b.ativo ? `${resumirDias(b.jornadas.map((j) => j.diaSemana))}, ${resumoHorario(b)}` : "Fora do link"}
                    </p>
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell">{resumirDias(b.jornadas.map((j) => j.diaSemana))}</td>
                  <td className="numeros hidden px-3 py-3 text-texto-sec sm:table-cell">{resumoHorario(b)}</td>
                  <td className="hidden px-3 py-3 text-texto-sec md:table-cell">
                    {b.servicoIds.length === 0 ? (
                      <span className="text-atencao">Nenhum</span>
                    ) : b.servicoIds.length >= totalServicos && totalServicos > 0 ? (
                      "Todos"
                    ) : (
                      `${b.servicoIds.length} de ${totalServicos}`
                    )}
                  </td>
                  <td className="text-right sm:px-5 sm:py-3">
                    <ChevronRight className="ml-auto size-5 text-texto-sec group-hover:text-texto" aria-hidden />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Painel>
      )}

      <Modal aberto={novo} aoFechar={() => setNovo(false)} titulo="Novo barbeiro" descricao="Ele começa com o horário da barbearia e todos os serviços. Ajuste em seguida.">
        <FormularioNovo aoFechar={() => setNovo(false)} />
      </Modal>
    </div>
  );
}

function FormularioNovo({ aoFechar }: { aoFechar: () => void }) {
  const { estado, pendente, aoEnviar } = useFormulario(criarBarbeiro);
  const erro = (campo: string) => estado.campos?.[campo] ?? null;
  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-5">
      <Campo rotulo="Nome" name="nome" maxLength={80} autoComplete="off" placeholder="Como o cliente conhece" erro={erro("nome")} />
      <AreaTexto rotulo="Apresentação (opcional)" name="bio" maxLength={500} placeholder="Ex.: especialista em degradê e barba na navalha." erro={erro("bio")} />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <RodapeModal>
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Voltar
        </Botao>
        <Botao type="submit" icone={<UserPlus aria-hidden />} carregando={pendente} textoCarregando="Cadastrando...">
          Cadastrar
        </Botao>
      </RodapeModal>
    </form>
  );
}
