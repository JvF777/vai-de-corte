"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarPlus, LoaderCircle } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { AreaTexto } from "@/components/ui/area-texto";
import { Botao } from "@/components/ui/botao";
import { Caixa } from "@/components/ui/caixa";
import { Campo } from "@/components/ui/campo";
import { Modal, RodapeModal } from "@/components/ui/modal";
import { Selecao } from "@/components/ui/selecao";
import type { Horario } from "@/lib/availability";
import { formatarDuracao, formatarPreco } from "@/lib/formatos";
import type { ServicoPainel } from "@/lib/painel/dados";
import { useFormulario } from "@/lib/painel/use-formulario";
import { buscarHorariosManual, criarAgendamentoManual } from "../actions";

export type MembroEquipe = { id: string; nome: string; servicoIds: string[] };

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  data: string;
  hoje: string;
  barbeiroInicial?: string;
  horaPreferida?: string;
  servicos: ServicoPainel[];
  equipe: MembroEquipe[];
  /** Barbeiro logado: só agenda para si mesmo. */
  barbeiroFixo: boolean;
};

export function NovoAgendamento({ aberto, aoFechar, ...props }: Props) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      largura="lg"
      titulo="Novo agendamento"
      descricao="Para o cliente que marcou pelo WhatsApp, por telefone ou no balcão."
    >
      <Formulario {...props} aoFechar={aoFechar} />
    </Modal>
  );
}

type Busca = { chave: string; horarios: Horario[]; erro: string | null };

function Formulario({ data, hoje, barbeiroInicial, horaPreferida, servicos, equipe, barbeiroFixo, aoFechar }: Omit<Props, "aberto">) {
  const inicialBarbeiro = barbeiroInicial ?? (equipe.length === 1 ? equipe[0].id : "");
  const [barbeiroId, setBarbeiroId] = useState(inicialBarbeiro);
  const [servicoId, setServicoId] = useState(() => {
    const doBarbeiro = servicos.filter((s) => !inicialBarbeiro || equipe.find((b) => b.id === inicialBarbeiro)?.servicoIds.includes(s.id));
    return doBarbeiro.length === 1 ? doBarbeiro[0].id : "";
  });
  const [dia, setDia] = useState(data < hoje ? hoje : data);
  const [inicio, setInicio] = useState("");
  const [encaixe, setEncaixe] = useState(false);
  const [busca, setBusca] = useState<Busca | null>(null);
  const [buscando, iniciar] = useTransition();
  const ultima = useRef("");
  const preferida = useRef(horaPreferida);

  const { estado, pendente, aoEnviar } = useFormulario(criarAgendamentoManual, aoFechar);
  const erro = (campo: string) => estado.campos?.[campo] ?? null;

  const barbeiro = equipe.find((b) => b.id === barbeiroId);
  const servicosPossiveis = servicos.filter((s) => !barbeiro || barbeiro.servicoIds.includes(s.id));
  const equipePossivel = equipe.filter((b) => !servicoId || b.servicoIds.includes(servicoId));

  function buscar(s: string, b: string, d: string) {
    setInicio("");
    if (!s || !b || !d) {
      ultima.current = "";
      setBusca(null);
      return;
    }
    consultar(s, b, d);
  }

  /** Busca os horários livres; respostas atrasadas de uma escolha anterior são ignoradas. */
  function consultar(s: string, b: string, d: string) {
    const chave = `${s}|${b}|${d}`;
    ultima.current = chave;
    iniciar(async () => {
      const r = await buscarHorariosManual({ servicoId: s, barbeiroId: b, data: d });
      if (ultima.current !== chave) return;
      setBusca({ chave, ...r });
      // Veio de um clique na grade: já deixa o horário clicado escolhido, se estiver livre.
      if (preferida.current) {
        const h = r.horarios.find((x) => x.hora === preferida.current);
        if (h) setInicio(h.inicio);
        preferida.current = undefined;
      }
    });
  }

  // Abre já buscando quando serviço e barbeiro vieram preenchidos.
  useEffect(() => {
    if (servicoId && barbeiroId && dia) consultar(servicoId, barbeiroId, dia);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na abertura; depois, cada campo busca ao mudar
  }, []);

  const horarios = busca?.horarios ?? [];
  const servico = servicos.find((s) => s.id === servicoId);

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Selecao
          rotulo="Serviço"
          name="servicoId"
          value={servicoId}
          erro={erro("servicoId")}
          onChange={(e) => {
            setServicoId(e.target.value);
            buscar(e.target.value, barbeiroId, dia);
          }}
        >
          <option value="">Escolha o serviço</option>
          {servicosPossiveis.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} ({formatarDuracao(s.duracaoMinutos)}, {formatarPreco(s.precoCentavos)})
            </option>
          ))}
        </Selecao>

        {barbeiroFixo ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-label font-medium text-texto-sec">Barbeiro</p>
            <p className="flex min-h-11 items-center">{barbeiro?.nome}</p>
            <input type="hidden" name="barbeiroId" value={barbeiroId} />
          </div>
        ) : (
          <Selecao
            rotulo="Barbeiro"
            name="barbeiroId"
            value={barbeiroId}
            erro={erro("barbeiroId")}
            onChange={(e) => {
              setBarbeiroId(e.target.value);
              buscar(servicoId, e.target.value, dia);
            }}
          >
            <option value="">Escolha o barbeiro</option>
            {equipePossivel.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
              </option>
            ))}
          </Selecao>
        )}

        <Campo
          rotulo="Data"
          type="date"
          name="data"
          min={hoje}
          value={dia}
          erro={erro("data")}
          className="numeros"
          onChange={(e) => {
            setDia(e.target.value);
            buscar(servicoId, barbeiroId, e.target.value);
          }}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-label font-medium text-texto-sec">
          Horário{servico ? ` (${formatarDuracao(servico.duracaoMinutos)})` : ""}
        </legend>
        <input type="hidden" name="inicio" value={encaixe ? "" : inicio} />

        {!encaixe && (
          <>
            {!servicoId || !barbeiroId ? (
              <p className="text-texto-disc">Escolha o serviço e o barbeiro para ver os horários livres.</p>
            ) : buscando && !busca ? (
              <p className="flex items-center gap-2 text-texto-sec">
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> Procurando horários livres...
              </p>
            ) : busca?.erro ? (
              <Aviso tipo="erro">{busca.erro}</Aviso>
            ) : horarios.length === 0 ? (
              <p className="text-texto-sec">Nenhum horário livre nesse dia. Escolha outra data ou encaixe o cliente.</p>
            ) : (
              <div
                role="radiogroup"
                aria-label="Horários livres"
                className={`grid grid-cols-4 gap-2 sm:grid-cols-6 ${buscando ? "opacity-60" : ""}`}
              >
                {horarios.map((h) => {
                  const marcado = h.inicio === inicio;
                  return (
                    <button
                      key={h.inicio}
                      type="button"
                      role="radio"
                      aria-checked={marcado}
                      onClick={() => setInicio(h.inicio)}
                      className={`numeros min-h-11 rounded-sm border text-base transition-colors ${
                        marcado
                          ? "border-ouro bg-ouro text-sobre-ouro font-semibold"
                          : "border-borda-forte text-texto hover:border-ouro-discreto hover:bg-ouro/10"
                      }`}
                    >
                      {h.hora}
                    </button>
                  );
                })}
              </div>
            )}
            {erro("inicio") && <p className="text-label text-erro">{erro("inicio")}</p>}
          </>
        )}

        <Caixa
          rotulo="Encaixar em outro horário"
          dica="Para atender fora da grade ou do expediente. Bloqueios e outros clientes continuam valendo."
          checked={encaixe}
          onChange={(e) => setEncaixe(e.target.checked)}
        />
        {encaixe && (
          <div className="sm:max-w-48">
            <Campo
              rotulo="Hora do encaixe"
              type="time"
              name="encaixe"
              step={300}
              defaultValue={horaPreferida ?? ""}
              erro={erro("encaixe")}
              className="numeros"
            />
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="WhatsApp do cliente"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 91234-5678"
          erro={erro("whatsapp")}
          dica="Se já for cliente, o nome do cadastro é mantido."
        />
        <Campo rotulo="Nome do cliente" name="nome" autoComplete="off" erro={erro("nome")} />
      </div>

      <AreaTexto rotulo="Observação (opcional)" name="observacoes" maxLength={500} erro={erro("observacoes")} />

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <RodapeModal>
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Voltar
        </Botao>
        <Botao type="submit" icone={<CalendarPlus aria-hidden />} carregando={pendente} textoCarregando="Agendando...">
          Agendar
        </Botao>
      </RodapeModal>
    </form>
  );
}
