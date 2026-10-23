"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarPlus, ChevronDown, LoaderCircle } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { AreaTexto } from "@/components/ui/area-texto";
import { Botao } from "@/components/ui/botao";
import { Caixa } from "@/components/ui/caixa";
import { Campo } from "@/components/ui/campo";
import { Modal, RodapeModal } from "@/components/ui/modal";
import { Selecao } from "@/components/ui/selecao";
import type { Horario } from "@/lib/availability";
import { formatarDuracao, formatarPreco, partesDoDia } from "@/lib/formatos";
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

/** "hoje", "amanhã" ou "sábado, 24 de outubro". */
function textoDia(data: string, hoje: string) {
  if (data === hoje) return "hoje";
  const amanha = new Date(`${hoje}T12:00:00Z`);
  amanha.setUTCDate(amanha.getUTCDate() + 1);
  if (data === amanha.toISOString().slice(0, 10)) return "amanhã";
  return partesDoDia(data).completa;
}

export function NovoAgendamento({ aberto, aoFechar, ...props }: Props) {
  // Veio de um horário vago da agenda: barbeiro, dia e hora já estão escolhidos.
  const rapido = Boolean(props.barbeiroInicial && props.horaPreferida);
  const nome = props.equipe.find((b) => b.id === props.barbeiroInicial)?.nome;
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      largura="lg"
      titulo={rapido ? `Agendar às ${props.horaPreferida}` : "Novo agendamento"}
      descricao={
        rapido
          ? `Com ${nome}, ${textoDia(props.data, props.hoje)}.`
          : "Para o cliente que marcou pelo WhatsApp, por telefone ou no balcão."
      }
    >
      <Formulario {...props} rapido={rapido} aoFechar={aoFechar} />
    </Modal>
  );
}

type Busca = { chave: string; horarios: Horario[]; erro: string | null };

function Formulario({
  data,
  hoje,
  barbeiroInicial,
  horaPreferida,
  servicos,
  equipe,
  barbeiroFixo,
  rapido,
  aoFechar,
}: Omit<Props, "aberto"> & { rapido: boolean }) {
  const inicialBarbeiro = barbeiroInicial ?? (equipe.length === 1 ? equipe[0].id : "");
  const [barbeiroId, setBarbeiroId] = useState(inicialBarbeiro);
  const [servicoId, setServicoId] = useState(() => {
    const doBarbeiro = servicos.filter((s) => !inicialBarbeiro || equipe.find((b) => b.id === inicialBarbeiro)?.servicoIds.includes(s.id));
    return doBarbeiro.length === 1 ? doBarbeiro[0].id : "";
  });
  const [dia, setDia] = useState(data < hoje ? hoje : data);
  const [inicio, setInicio] = useState("");
  /** Hora que o barbeiro quer ("16:30"): continua escolhida quando ele troca de serviço, se ainda couber. */
  const [alvo, setAlvo] = useState(horaPreferida ?? "");
  const [mudarOnde, setMudarOnde] = useState(!rapido);
  const [mais, setMais] = useState(false);
  const [encaixe, setEncaixe] = useState(false);
  const [busca, setBusca] = useState<Busca | null>(null);
  const [buscando, iniciar] = useTransition();
  const ultima = useRef("");

  const { estado, pendente, aoEnviar } = useFormulario(criarAgendamentoManual, aoFechar);
  const erro = (campo: string) => estado.campos?.[campo] ?? null;

  const barbeiro = equipe.find((b) => b.id === barbeiroId);
  const servicosPossiveis = servicos.filter((s) => !barbeiro || barbeiro.servicoIds.includes(s.id));
  const equipePossivel = equipe.filter((b) => !servicoId || b.servicoIds.includes(servicoId));

  function buscar(s: string, b: string, d: string, hora = alvo) {
    setInicio("");
    if (!s || !b || !d) {
      ultima.current = "";
      setBusca(null);
      return;
    }
    consultar(s, b, d, hora);
  }

  /** Busca os horários livres; respostas atrasadas de uma escolha anterior são ignoradas. */
  function consultar(s: string, b: string, d: string, hora: string) {
    const chave = `${s}|${b}|${d}`;
    ultima.current = chave;
    iniciar(async () => {
      const r = await buscarHorariosManual({ servicoId: s, barbeiroId: b, data: d });
      if (ultima.current !== chave) return;
      setBusca({ chave, ...r });
      const h = hora ? r.horarios.find((x) => x.hora === hora) : undefined;
      setInicio(h?.inicio ?? "");
    });
  }

  // Abre já buscando quando serviço e barbeiro vieram preenchidos.
  useEffect(() => {
    if (servicoId && barbeiroId && dia) consultar(servicoId, barbeiroId, dia, alvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na abertura; depois, cada campo busca ao mudar
  }, []);

  const horarios = busca?.horarios ?? [];
  const servico = servicos.find((s) => s.id === servicoId);
  const alvoNaoCabe = Boolean(alvo && busca && !busca.erro && !buscando && !inicio && horarios.length > 0);

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-6">
      {/* 1. Serviço: botões grandes, um toque escolhe. */}
      <fieldset>
        <legend className="mb-2 text-label font-medium text-texto-sec">Serviço</legend>
        <input type="hidden" name="servicoId" value={servicoId} />
        {servicosPossiveis.length === 0 ? (
          <p className="text-texto-sec">Esse barbeiro ainda não tem serviços. Marque o que ele faz em Barbeiros.</p>
        ) : (
          <div role="radiogroup" aria-label="Serviço" className="grid gap-2 sm:grid-cols-2">
            {servicosPossiveis.map((s) => {
              const marcado = s.id === servicoId;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={marcado}
                  onClick={() => {
                    setServicoId(s.id);
                    buscar(s.id, barbeiroId, dia);
                  }}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-sm border px-4 py-2.5 text-left transition-colors ${
                    marcado ? "border-ouro bg-ouro/10" : "border-borda-forte hover:border-ouro-discreto hover:bg-elevado"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-texto">{s.nome}</span>
                    <span className="block text-label text-texto-sec">{formatarDuracao(s.duracaoMinutos)}</span>
                  </span>
                  <span className={`numeros shrink-0 ${marcado ? "text-ouro-hover" : "text-texto-sec"}`}>{formatarPreco(s.precoCentavos)}</span>
                </button>
              );
            })}
          </div>
        )}
        {erro("servicoId") && <p className="mt-2 text-label text-erro">{erro("servicoId")}</p>}
      </fieldset>

      {/* 2. Barbeiro e dia: já vêm prontos quando o barbeiro tocou num horário vago. */}
      {mudarOnde ? (
        <div className="grid gap-4 sm:grid-cols-2">
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
      ) : (
        <>
          <input type="hidden" name="barbeiroId" value={barbeiroId} />
          <input type="hidden" name="data" value={dia} />
        </>
      )}

      {/* 3. Horário: a hora tocada na agenda já vem marcada. */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 flex w-full items-baseline justify-between gap-3 text-label font-medium text-texto-sec">
          <span>Horário{servico ? ` (${formatarDuracao(servico.duracaoMinutos)})` : ""}</span>
          {!mudarOnde && (
            <button type="button" onClick={() => setMudarOnde(true)} className="min-h-11 font-normal text-ouro-hover underline-offset-4 hover:underline">
              Mudar barbeiro ou dia
            </button>
          )}
        </legend>
        <input type="hidden" name="inicio" value={encaixe ? "" : inicio} />

        {!encaixe && (
          <>
            {!servicoId || !barbeiroId ? (
              <p className="text-texto-disc">
                {alvo && barbeiroId ? `Escolha o serviço para confirmar as ${alvo}.` : "Escolha o serviço e o barbeiro para ver os horários livres."}
              </p>
            ) : buscando && !busca ? (
              <p className="flex items-center gap-2 text-texto-sec">
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> Procurando horários livres...
              </p>
            ) : busca?.erro ? (
              <Aviso tipo="erro">{busca.erro}</Aviso>
            ) : horarios.length === 0 ? (
              <p className="text-texto-sec">Nenhum horário livre nesse dia. Escolha outro dia ou encaixe o cliente em Mais opções.</p>
            ) : (
              <>
                {alvoNaoCabe && (
                  <Aviso tipo="atencao">
                    {servico?.nome} ({formatarDuracao(servico?.duracaoMinutos ?? 0)}) não cabe às {alvo}. Escolha outro horário abaixo.
                  </Aviso>
                )}
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
                        onClick={() => {
                          setInicio(h.inicio);
                          setAlvo(h.hora);
                        }}
                        className={`numeros min-h-11 rounded-sm border text-base transition-colors ${
                          marcado
                            ? "border-ouro bg-ouro font-semibold text-sobre-ouro"
                            : "border-borda-forte text-texto hover:border-ouro-discreto hover:bg-ouro/10"
                        }`}
                      >
                        {h.hora}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {erro("inicio") && <p className="text-label text-erro">{erro("inicio")}</p>}
          </>
        )}
        {encaixe && <p className="text-texto-sec">Encaixe ligado: o horário vem do campo em Mais opções.</p>}
      </fieldset>

      {/* 4. Cliente: o WhatsApp primeiro, porque ele identifica quem já é cliente. */}
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

      <div className="flex flex-col gap-4">
        <button
          type="button"
          aria-expanded={mais || encaixe}
          onClick={() => setMais((v) => !v)}
          className="flex min-h-11 items-center gap-2 self-start text-texto-sec hover:text-texto"
        >
          <ChevronDown className={`size-4 transition-transform ${mais || encaixe ? "rotate-180" : ""}`} aria-hidden />
          Mais opções
        </button>
        <div className={mais || encaixe ? "flex flex-col gap-4" : "hidden"}>
          <AreaTexto rotulo="Observação (opcional)" name="observacoes" maxLength={500} erro={erro("observacoes")} />
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
                defaultValue={alvo}
                erro={erro("encaixe")}
                className="numeros"
              />
            </div>
          )}
        </div>
      </div>

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <RodapeModal>
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Voltar
        </Botao>
        <Botao type="submit" icone={<CalendarPlus aria-hidden />} carregando={pendente} textoCarregando="Agendando...">
          {inicio && !encaixe ? `Agendar às ${horarios.find((h) => h.inicio === inicio)?.hora ?? alvo}` : "Agendar"}
        </Botao>
      </RodapeModal>
    </form>
  );
}
