"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Caixa } from "@/components/ui/caixa";
import { Campo } from "@/components/ui/campo";
import { Modal, RodapeModal } from "@/components/ui/modal";
import { Selecao } from "@/components/ui/selecao";
import { useFormulario } from "@/lib/painel/use-formulario";
import { criarBloqueio } from "../actions";
import type { MembroEquipe } from "./novo-agendamento";

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  data: string;
  hoje: string;
  barbeiroInicial: string;
  equipe: MembroEquipe[];
  /** Só o dono fecha a barbearia inteira. */
  podeBarbeariaInteira: boolean;
};

export function BloquearHorario({ aberto, aoFechar, ...props }: Props) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Bloquear horário"
      descricao="O horário some do link de agendamento. Use para compromisso, pausa ou dia de folga."
    >
      <Formulario {...props} aoFechar={aoFechar} />
    </Modal>
  );
}

function Formulario({ data, hoje, barbeiroInicial, equipe, podeBarbeariaInteira, aoFechar }: Omit<Props, "aberto">) {
  const [diaInteiro, setDiaInteiro] = useState(false);
  const { estado, pendente, aoEnviar } = useFormulario(criarBloqueio, aoFechar);
  const erro = (campo: string) => estado.campos?.[campo] ?? null;
  const fixo = !podeBarbeariaInteira && equipe.length === 1;

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-5">
      {fixo ? (
        <input type="hidden" name="barbeiroId" value={equipe[0].id} />
      ) : (
        <Selecao rotulo="Agenda de" name="barbeiroId" defaultValue={barbeiroInicial} erro={erro("barbeiroId")}>
          {podeBarbeariaInteira && <option value="">Barbearia inteira (todos os barbeiros)</option>}
          {equipe.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </Selecao>
      )}

      <Campo rotulo="Data" type="date" name="data" min={hoje} defaultValue={data < hoje ? hoje : data} erro={erro("data")} className="numeros" />

      <Caixa
        rotulo="O dia inteiro"
        dica="Folga, feriado ou dia sem atendimento."
        name="diaInteiro"
        value="sim"
        checked={diaInteiro}
        onChange={(e) => setDiaInteiro(e.target.checked)}
      />

      {!diaInteiro && (
        <div className="grid grid-cols-2 gap-4">
          <Campo rotulo="De" type="time" name="inicio" step={300} defaultValue="12:00" erro={erro("inicio")} className="numeros" />
          <Campo rotulo="Até" type="time" name="fim" step={300} defaultValue="13:00" erro={erro("fim")} className="numeros" />
        </div>
      )}

      <Campo rotulo="Motivo (opcional)" name="motivo" maxLength={200} placeholder="Ex.: consulta médica" erro={erro("motivo")} dica="Só a equipe vê. O cliente vê apenas que o horário não está livre." />

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <RodapeModal>
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Voltar
        </Botao>
        <Botao type="submit" icone={<Lock aria-hidden />} carregando={pendente} textoCarregando="Bloqueando...">
          Bloquear
        </Botao>
      </RodapeModal>
    </form>
  );
}
