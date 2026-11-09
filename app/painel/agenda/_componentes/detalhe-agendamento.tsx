"use client";

import { useState, useTransition } from "react";
import { Ban, Check, CheckCheck, MessageCircle, RotateCcw, UserX } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Botao, type VarianteBotao } from "@/components/ui/botao";
import { Modal } from "@/components/ui/modal";
import { SeloStatus } from "@/components/ui/selo-status";
import { formatarDataLonga, formatarHora, formatarPreco, formatarWhatsapp, linkWhatsapp } from "@/lib/formatos";
import { acoesPermitidas, type Acao } from "@/lib/painel/agenda";
import type { AgendamentoPainel } from "@/lib/painel/dados";
import { alterarStatus } from "../actions";

const BOTOES: Record<Acao, { rotulo: string; carregando: string; variante: VarianteBotao; Icone: typeof Check }> = {
  confirmar: { rotulo: "Confirmar", carregando: "Confirmando...", variante: "primario", Icone: Check },
  concluir: { rotulo: "Concluir atendimento", carregando: "Concluindo...", variante: "primario", Icone: CheckCheck },
  falta: { rotulo: "Cliente faltou", carregando: "Salvando...", variante: "secundario", Icone: UserX },
  cancelar: { rotulo: "Cancelar agendamento", carregando: "Cancelando...", variante: "destrutivo", Icone: Ban },
  reabrir: { rotulo: "Reabrir agendamento", carregando: "Reabrindo...", variante: "secundario", Icone: RotateCcw },
};

type Props = {
  agendamento: AgendamentoPainel | null;
  nomeBarbeiro: string;
  agora: string;
  aoFechar: () => void;
};

export function DetalheAgendamento({ agendamento, nomeBarbeiro, agora, aoFechar }: Props) {
  // O conteúdo fica num componente com key: cada agendamento aberto começa sem erro nem confirmação pendente.
  return (
    <Modal
      aberto={agendamento !== null}
      aoFechar={aoFechar}
      titulo={agendamento?.cliente.nome ?? ""}
      descricao={agendamento ? `${agendamento.servico.nome} com ${nomeBarbeiro}` : undefined}
    >
      {agendamento && <Conteudo key={agendamento.id} agendamento={agendamento} agora={agora} aoFechar={aoFechar} />}
    </Modal>
  );
}

function Conteudo({ agendamento: a, agora, aoFechar }: { agendamento: AgendamentoPainel; agora: string; aoFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [emAndamento, setEmAndamento] = useState<Acao | null>(null);
  const [, iniciar] = useTransition();

  // A hora do servidor pode estar alguns minutos atrás: usa a mais recente.
  const [agoraReal] = useState(() => new Date(Math.max(new Date(agora).getTime(), Date.now())));
  const acoes = acoesPermitidas(a.status, a.inicio, agoraReal);
  const principais = acoes.filter((x) => x !== "cancelar");

  function executar(acao: Acao) {
    setErro(null);
    setEmAndamento(acao);
    iniciar(async () => {
      const r = await alterarStatus({ id: a.id, acao });
      setEmAndamento(null);
      if (r.erro) setErro(r.erro);
      else aoFechar();
    });
  }

  const ocupado = emAndamento !== null;

  return (
    <div className="flex flex-col gap-5 pb-5">
      <div className="flex flex-wrap items-center gap-3">
        <SeloStatus valor={a.status} />
        <span className="text-label text-texto-sec">{a.origem === "manual" ? "Agendado no painel" : "Agendado pelo link"}</span>
      </div>

      <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3">
        <dt className="text-texto-sec">Quando</dt>
        <dd className="first-letter:uppercase">
          {formatarDataLonga(a.inicio)}
          <span className="numeros block text-texto-sec">
            {formatarHora(a.inicio)} às {formatarHora(a.fim)}
          </span>
        </dd>
        <dt className="text-texto-sec">Valor</dt>
        <dd className="numeros">{formatarPreco(a.precoCentavos)}</dd>
        <dt className="text-texto-sec">WhatsApp</dt>
        <dd>
          <a
            href={linkWhatsapp(a.cliente.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-ouro-hover underline-offset-4 hover:underline"
          >
            <MessageCircle className="size-4" aria-hidden />
            <span className="numeros whitespace-nowrap">{formatarWhatsapp(a.cliente.whatsapp)}</span>
          </a>
        </dd>
        {a.observacoes && (
          <>
            <dt className="text-texto-sec">Observação</dt>
            <dd className="whitespace-pre-line">{a.observacoes}</dd>
          </>
        )}
      </dl>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {confirmandoCancelamento ? (
        <div className="flex flex-col gap-3 rounded-sm border border-erro/40 bg-erro-fundo p-4">
          <p className="font-medium text-texto">Cancelar o horário de {a.cliente.nome.split(" ")[0]}?</p>
          <p className="text-texto-sec">O horário volta a ficar livre no link de agendamento.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao variante="fantasma" onClick={() => setConfirmandoCancelamento(false)} disabled={ocupado}>
              Manter
            </Botao>
            <Botao
              variante="destrutivo"
              icone={<Ban aria-hidden />}
              carregando={emAndamento === "cancelar"}
              textoCarregando="Cancelando..."
              onClick={() => executar("cancelar")}
            >
              Sim, cancelar
            </Botao>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {principais.map((acao) => {
            const { rotulo, carregando, variante, Icone } = BOTOES[acao];
            return (
              <Botao
                key={acao}
                variante={variante}
                icone={<Icone aria-hidden />}
                carregando={emAndamento === acao}
                textoCarregando={carregando}
                disabled={ocupado}
                onClick={() => executar(acao)}
              >
                {rotulo}
              </Botao>
            );
          })}
          {acoes.includes("cancelar") && (
            <Botao
              variante="fantasma"
              icone={<Ban aria-hidden />}
              disabled={ocupado}
              onClick={() => setConfirmandoCancelamento(true)}
              className="sm:ml-auto"
            >
              Cancelar
            </Botao>
          )}
        </div>
      )}

      {(a.status === "agendado" || a.status === "confirmado") && !acoes.includes("concluir") && (
        <p className="text-label text-texto-disc">Concluir e marcar falta ficam disponíveis quando o horário começar.</p>
      )}
    </div>
  );
}
