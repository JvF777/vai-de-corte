"use client";

import { useState, useTransition } from "react";
import { LockOpen } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Modal } from "@/components/ui/modal";
import { formatarDataLonga, formatarHora } from "@/lib/formatos";
import type { BloqueioPainel } from "@/lib/painel/dados";
import { removerBloqueio } from "../actions";

const TITULOS = { bloqueio: "Horário bloqueado", folga: "Folga", feriado: "Barbearia fechada" } as const;

type Props = {
  bloqueio: BloqueioPainel | null;
  nomeBarbeiro: string;
  podeLiberar: boolean;
  aoFechar: () => void;
};

export function DetalheBloqueio({ bloqueio, nomeBarbeiro, podeLiberar, aoFechar }: Props) {
  return (
    <Modal aberto={bloqueio !== null} aoFechar={aoFechar} titulo={bloqueio ? TITULOS[bloqueio.tipo] : ""} descricao={nomeBarbeiro}>
      {bloqueio && <Conteudo key={bloqueio.id} bloqueio={bloqueio} podeLiberar={podeLiberar} aoFechar={aoFechar} />}
    </Modal>
  );
}

/** Período em texto: "sexta, 23 de outubro, 13:00 às 14:00" ou "de 23/10 até 25/10". */
function periodo(b: BloqueioPainel) {
  const ini = new Date(b.inicio);
  const fim = new Date(b.fim);
  const ultimoDia = new Date(fim.getTime() - 1);
  if (formatarDataLonga(ini) === formatarDataLonga(ultimoDia)) {
    const diaTodo = formatarHora(ini) === "00:00" && formatarHora(fim) === "00:00";
    return `${formatarDataLonga(ini)}, ${diaTodo ? "o dia todo" : `${formatarHora(ini)} às ${formatarHora(fim)}`}`;
  }
  return `De ${formatarDataLonga(ini)} até ${formatarDataLonga(ultimoDia)}`;
}

function Conteudo({ bloqueio, podeLiberar, aoFechar }: { bloqueio: BloqueioPainel; podeLiberar: boolean; aoFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [liberando, iniciar] = useTransition();

  return (
    <div className="flex flex-col gap-5 pb-5">
      <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3">
        <dt className="text-texto-sec">Quando</dt>
        <dd className="first-letter:uppercase">{periodo(bloqueio)}</dd>
        <dt className="text-texto-sec">Motivo</dt>
        <dd className={bloqueio.motivo ? "" : "text-texto-disc"}>{bloqueio.motivo ?? "Sem motivo informado"}</dd>
      </dl>
      <p className="text-texto-sec">Enquanto estiver bloqueado, esse horário não aparece no link de agendamento.</p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {podeLiberar ? (
        <Botao
          variante="secundario"
          icone={<LockOpen aria-hidden />}
          carregando={liberando}
          textoCarregando="Liberando..."
          className="sm:self-start"
          onClick={() =>
            iniciar(async () => {
              const r = await removerBloqueio(bloqueio.id);
              if (r.erro) setErro(r.erro);
              else aoFechar();
            })
          }
        >
          Liberar horário
        </Botao>
      ) : (
        <p className="text-label text-texto-disc">Só o dono da barbearia pode liberar este bloqueio.</p>
      )}
    </div>
  );
}
