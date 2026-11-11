"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { AreaTexto } from "@/components/ui/area-texto";
import { Botao } from "@/components/ui/botao";
import { Caixa } from "@/components/ui/caixa";
import { Campo } from "@/components/ui/campo";
import { CampoPreco } from "@/components/ui/campo-preco";
import { DURACOES } from "@/lib/cadastro";
import { Modal, RodapeModal } from "@/components/ui/modal";
import { Painel } from "@/components/ui/painel";
import { Selecao } from "@/components/ui/selecao";
import { centavosParaTexto, formatarDuracao, formatarPreco } from "@/lib/formatos";
import type { ServicoPainel } from "@/lib/painel/dados";
import { useFormulario } from "@/lib/painel/use-formulario";
import { excluirServico, salvarServico } from "../actions";

type Barbeiro = { id: string; nome: string; ativo: boolean; servicoIds: string[] };


export function ListaServicos({ servicos, barbeiros }: { servicos: ServicoPainel[]; barbeiros: Barbeiro[] }) {
  // undefined = fechado, null = novo, objeto = editando
  const [editando, setEditando] = useState<ServicoPainel | null | undefined>(undefined);
  const quemFaz = (id: string) => barbeiros.filter((b) => b.ativo && b.servicoIds.includes(id));
  const semBarbeiro = servicos.filter((s) => s.ativo && quemFaz(s.id).length === 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-titulo text-[1.625rem] font-bold leading-tight tracking-[-0.02em] sm:text-titulo">Serviços</h1>
          <p className="mt-1 max-w-xl text-texto-sec">O que o cliente escolhe no link de agendamento, com preço e duração.</p>
        </div>
        <Botao icone={<Plus aria-hidden />} onClick={() => setEditando(null)}>
          Novo serviço
        </Botao>
      </header>

      {semBarbeiro.length > 0 && (
        <Aviso tipo="atencao" titulo={semBarbeiro.length === 1 ? "1 serviço não aparece no link" : `${semBarbeiro.length} serviços não aparecem no link`}>
          Nenhum barbeiro faz {semBarbeiro.map((s) => s.nome).join(", ")}. Edite o serviço e marque quem atende.
        </Aviso>
      )}

      {servicos.length === 0 ? (
        <Painel className="flex flex-col items-start gap-3 px-5 py-8">
          <p className="font-titulo text-subtitulo font-semibold">Nenhum serviço cadastrado</p>
          <p className="text-texto-sec">Comece pelo mais pedido, como corte ou barba. O cliente só consegue agendar depois disso.</p>
          <Botao icone={<Plus aria-hidden />} onClick={() => setEditando(null)}>
            Cadastrar o primeiro serviço
          </Botao>
        </Painel>
      ) : (
        <Painel className="overflow-hidden">
          <table className="w-full text-left">
            <caption className="sr-only">Serviços cadastrados</caption>
            <thead className="hidden border-b border-borda text-label text-texto-sec sm:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Serviço
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Duração
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Preço
                </th>
                <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">
                  Quem faz
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {servicos.map((s) => {
                const equipe = quemFaz(s.id);
                return (
                  <tr key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-5 py-4 sm:table-row sm:p-0">
                    <td className="min-w-0 sm:px-5 sm:py-4">
                      <p className={`font-medium ${s.ativo ? "text-texto" : "text-texto-sec"}`}>
                        {s.nome}
                        {!s.ativo && <span className="ml-2 text-label font-normal text-texto-disc">fora do link</span>}
                      </p>
                      {s.descricao && <p className="max-w-md truncate text-label text-texto-sec">{s.descricao}</p>}
                      <p className="numeros mt-1 text-label text-texto-sec sm:hidden">
                        {formatarDuracao(s.duracaoMinutos)}, {formatarPreco(s.precoCentavos)}
                      </p>
                    </td>
                    <td className="numeros hidden px-3 py-4 text-right text-texto-sec sm:table-cell">{formatarDuracao(s.duracaoMinutos)}</td>
                    <td className="numeros hidden px-3 py-4 text-right sm:table-cell">{formatarPreco(s.precoCentavos)}</td>
                    <td className="hidden px-3 py-4 text-texto-sec md:table-cell">
                      {equipe.length ? equipe.map((b) => b.nome).join(", ") : <span className="text-atencao">Ninguém</span>}
                    </td>
                    <td className="text-right sm:px-5 sm:py-4">
                      <Botao variante="fantasma" icone={<Pencil aria-hidden />} onClick={() => setEditando(s)} aria-label={`Editar ${s.nome}`}>
                        <span className="hidden sm:inline">Editar</span>
                      </Botao>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Painel>
      )}

      <Modal
        aberto={editando !== undefined}
        aoFechar={() => setEditando(undefined)}
        titulo={editando ? "Editar serviço" : "Novo serviço"}
        descricao={editando ? editando.nome : "Aparece no link assim que um barbeiro fizer o serviço."}
      >
        {editando !== undefined && (
          <FormularioServico
            key={editando?.id ?? "novo"}
            servico={editando}
            barbeiros={barbeiros}
            aoFechar={() => setEditando(undefined)}
          />
        )}
      </Modal>
    </div>
  );
}

function FormularioServico({ servico, barbeiros, aoFechar }: { servico: ServicoPainel | null; barbeiros: Barbeiro[]; aoFechar: () => void }) {
  const { estado, pendente, aoEnviar } = useFormulario(salvarServico, aoFechar);
  const erro = (campo: string) => estado.campos?.[campo] ?? null;
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [excluindo, iniciar] = useTransition();
  const duracoes = servico && !DURACOES.includes(servico.duracaoMinutos) ? [...DURACOES, servico.duracaoMinutos].sort((a, b) => a - b) : DURACOES;

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="id" value={servico?.id ?? ""} />
      <Campo rotulo="Nome" name="nome" defaultValue={servico?.nome} maxLength={80} placeholder="Ex.: Corte degradê" erro={erro("nome")} />
      <div className="grid grid-cols-2 gap-4">
        <Selecao rotulo="Duração" name="duracao" defaultValue={servico?.duracaoMinutos ?? 30} erro={erro("duracao")}>
          {duracoes.map((m) => (
            <option key={m} value={m}>
              {formatarDuracao(m)}
            </option>
          ))}
        </Selecao>
        <CampoPreco
          rotulo="Preço"
          name="preco"
          defaultValue={servico ? centavosParaTexto(servico.precoCentavos) : ""}
          placeholder="40,00"
          erro={erro("preco")}
        />
      </div>
      <AreaTexto rotulo="Descrição (opcional)" name="descricao" defaultValue={servico?.descricao ?? ""} maxLength={500} erro={erro("descricao")} />

      <fieldset>
        <legend className="text-label font-medium text-texto-sec">Quem faz</legend>
        {barbeiros.length === 0 ? (
          <p className="mt-2 text-texto-disc">Cadastre os barbeiros em Barbeiros para escolher aqui.</p>
        ) : (
          <div className="mt-1 grid sm:grid-cols-2">
            {barbeiros.map((b) => (
              <Caixa
                key={b.id}
                name="barbeiros"
                value={b.id}
                defaultChecked={servico ? b.servicoIds.includes(servico.id) : b.ativo}
                rotulo={b.nome}
                dica={b.ativo ? undefined : "Desativado"}
              />
            ))}
          </div>
        )}
      </fieldset>

      <Caixa name="ativo" value="sim" defaultChecked={servico?.ativo ?? true} rotulo="Aparece no link de agendamento" dica="Desmarque para esconder sem perder o histórico." />

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {erroExclusao && <Aviso tipo="erro">{erroExclusao}</Aviso>}

      {confirmandoExclusao && servico ? (
        <div className="flex flex-col gap-3 rounded-sm border border-erro/40 bg-erro-fundo p-4">
          <p className="font-medium">Excluir {servico.nome}?</p>
          <p className="text-texto-sec">Se já tiver agendamentos, o serviço não pode ser excluído; aí é só tirar do link.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao type="button" variante="fantasma" onClick={() => setConfirmandoExclusao(false)}>
              Manter
            </Botao>
            <Botao
              type="button"
              variante="destrutivo"
              icone={<Trash2 aria-hidden />}
              carregando={excluindo}
              textoCarregando="Excluindo..."
              onClick={() =>
                iniciar(async () => {
                  const r = await excluirServico(servico.id);
                  if (r.erro) {
                    setErroExclusao(r.erro);
                    setConfirmandoExclusao(false);
                  } else aoFechar();
                })
              }
            >
              Sim, excluir
            </Botao>
          </div>
        </div>
      ) : null}

      <RodapeModal>
        {servico && (
          <Botao type="button" variante="fantasma" icone={<Trash2 aria-hidden />} onClick={() => setConfirmandoExclusao(true)} className="sm:mr-auto">
            Excluir
          </Botao>
        )}
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Voltar
        </Botao>
        <Botao type="submit" carregando={pendente} textoCarregando="Salvando...">
          {servico ? "Salvar serviço" : "Criar serviço"}
        </Botao>
      </RodapeModal>
    </form>
  );
}
