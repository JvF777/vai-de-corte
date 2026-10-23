"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarCheck, Clock, Users } from "lucide-react";
import { COM_MOVIMENTO, gsap, useGSAP } from "@/components/animacao/gsap";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { barbeirosElegiveis, diasDaJanela, type Funcionamento, type Horario, type Regras } from "@/lib/availability";
import { formatarDuracao, formatarPreco, partesDoDia } from "@/lib/formatos";
import type { Barbeiro, Servico } from "@/lib/vitrine";
import { agendar, buscarHorarios, type EstadoAgendamento, type ResultadoHorarios } from "../actions";
import { Etapa, type SituacaoEtapa } from "./etapa";
import { SeletorHorario } from "./seletor-horario";

type Props = {
  slug: string;
  nomeBarbearia: string;
  servicos: Servico[];
  barbeiros: Barbeiro[];
  funcionamento: Funcionamento[];
  regras: Regras;
  /** Hora do servidor (ISO), para servidor e navegador montarem os mesmos dias. */
  agora: string;
};

type NomeEtapa = "servico" | "barbeiro" | "horario" | "dados";
const ORDEM: NomeEtapa[] = ["servico", "barbeiro", "horario", "dados"];

/** "qualquer" = qualquer barbeiro disponível; nulo = ainda não escolheu. */
type EscolhaBarbeiro = string | "qualquer" | null;

const estadoInicial: EstadoAgendamento = { erro: null, tentativa: 0 };

export function FluxoAgendamento({ slug, nomeBarbearia, servicos, barbeiros, funcionamento, regras, agora }: Props) {
  const [etapa, setEtapa] = useState<NomeEtapa>("servico");
  const [interagiu, setInteragiu] = useState(false);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [barbeiro, setBarbeiro] = useState<EscolhaBarbeiro>(null);
  const [data, setData] = useState<string | null>(null);
  const [horario, setHorarioEscolhido] = useState<Horario | null>(null);
  /** Em "qualquer barbeiro": quem vai atender no horário escolhido. */
  const [atendente, setAtendente] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoHorarios | null>(null);
  const [carregando, iniciar] = useTransition();
  const ultimaBusca = useRef("");
  const escopo = useRef<HTMLDivElement>(null);

  const servico = servicos.find((s) => s.id === servicoId) ?? null;
  const elegiveis = useMemo(
    () => (servicoId ? barbeirosElegiveis(barbeiros, servicoId, null) : []),
    [barbeiros, servicoId],
  );
  const barbeiroId = barbeiro && barbeiro !== "qualquer" ? barbeiro : null;
  const dias = useMemo(
    () =>
      servicoId
        ? diasDaJanela({ servicoId, barbeiroId, barbeiros, funcionamento, regras, agora: new Date(agora) })
        : [],
    [servicoId, barbeiroId, barbeiros, funcionamento, regras, agora],
  );

  function setHorario(h: Horario | null) {
    setHorarioEscolhido(h);
    setAtendente(null);
  }

  function carregarHorarios(dia: string, servico_: string, barbeiro_: string | null) {
    const chave = `${servico_}|${barbeiro_}|${dia}`;
    ultimaBusca.current = chave;
    iniciar(async () => {
      const r = await buscarHorarios({ slug, servicoId: servico_, barbeiroId: barbeiro_, data: dia });
      // Ignora respostas atrasadas de uma escolha anterior.
      if (ultimaBusca.current === chave) setResultado(r);
    });
  }

  function irPara(proxima: NomeEtapa) {
    setInteragiu(true);
    setEtapa(proxima);
  }

  /** Abre a escolha de horário mantendo o dia, se ele ainda serve. */
  function abrirHorarios(servico_: string, escolha: EscolhaBarbeiro) {
    const id = escolha && escolha !== "qualquer" ? escolha : null;
    const diasValidos = diasDaJanela({ servicoId: servico_, barbeiroId: id, barbeiros, funcionamento, regras, agora: new Date(agora) });
    const dia = diasValidos.find((d) => d.atende && d.data === data)?.data ?? diasValidos.find((d) => d.atende)?.data ?? null;
    setData(dia);
    setHorario(null);
    setResultado(null);
    if (dia) carregarHorarios(dia, servico_, id);
    irPara("horario");
  }

  function escolherServico(id: string) {
    if (id === servicoId && barbeiro) return irPara(horario && (barbeiro !== "qualquer" || atendente) ? "dados" : "horario");
    setServicoId(id);
    const quem = barbeirosElegiveis(barbeiros, id, null);
    // Só um barbeiro faz esse serviço: escolhe por ele e pula a etapa.
    const escolha: EscolhaBarbeiro =
      quem.length === 1 ? quem[0].id : barbeiro && (barbeiro === "qualquer" || quem.some((b) => b.id === barbeiro)) ? barbeiro : null;
    setBarbeiro(escolha);
    if (escolha) abrirHorarios(id, escolha);
    else {
      setHorario(null);
      irPara("barbeiro");
    }
  }

  function escolherBarbeiro(escolha: EscolhaBarbeiro) {
    if (!servicoId) return;
    if (escolha === barbeiro && horario && (escolha !== "qualquer" || atendente)) return irPara("dados");
    setBarbeiro(escolha);
    abrirHorarios(servicoId, escolha);
  }

  function escolherDia(dia: string) {
    if (!servicoId) return;
    setData(dia);
    setHorario(null);
    carregarHorarios(dia, servicoId, barbeiroId);
  }

  function escolherHorario(h: Horario) {
    setHorario(h);
    if (barbeiro !== "qualquer") return irPara("dados");
    // Qualquer barbeiro: com um só livre, vai ele; com mais de um, o cliente escolhe.
    if (h.barbeiroIds.length === 1) {
      setAtendente(h.barbeiroIds[0]);
      irPara("dados");
    }
  }

  function escolherAtendente(id: string) {
    setAtendente(id);
    irPara("dados");
  }

  const [estado, enviar, enviando] = useActionState(async (anterior: EstadoAgendamento, formData: FormData) => {
    const r = await agendar(anterior, formData);
    if (r.horarioPerdido && servicoId) {
      // Alguém reservou antes: volta para os horários já atualizados.
      setHorario(null);
      setEtapa("horario");
      if (data) carregarHorarios(data, servicoId, barbeiroId);
    }
    return r;
  }, estadoInicial);

  // O conteúdo da etapa que abre entra suave; responde ao toque do cliente.
  useGSAP(
    () => {
      if (!interagiu) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        gsap.from("[data-etapa-corpo]", { autoAlpha: 0, y: 10, duration: 0.45, clearProps: "all" });
      });
      return () => mm.revert();
    },
    { scope: escopo, dependencies: [etapa] },
  );

  const indice = ORDEM.indexOf(etapa);
  const situacao = (nome: NomeEtapa): SituacaoEtapa => {
    const i = ORDEM.indexOf(nome);
    if (i === indice) return "atual";
    return i < indice ? "feita" : "futura";
  };
  const nomeDe = (id: string | null) => barbeiros.find((b) => b.id === id)?.nome ?? "";
  const nomeBarbeiro = barbeiro === "qualquer" ? "Qualquer barbeiro disponível" : nomeDe(barbeiro);
  // Barbeiro que vai no agendamento: o escolhido na etapa 2 ou o escolhido no horário.
  const barbeiroFinal = barbeiroId ?? atendente;
  const precisaAtendente = barbeiro === "qualquer" && horario !== null && !atendente;
  const quando = horario && data ? `${partesDoDia(data).completa}, às ${horario.hora}` : null;

  return (
    <div ref={escopo}>
      <ol className="flex flex-col">
        <Etapa
          numero={1}
          titulo="Serviço"
          situacao={situacao("servico")}
          focarAoAbrir={interagiu}
          onAlterar={() => irPara("servico")}
          resumo={servico && <ResumoServico servico={servico} />}
        >
          <ul className="flex flex-col gap-2">
            {servicos.map((s) => {
              const selecionado = s.id === servicoId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={selecionado}
                    onClick={() => escolherServico(s.id)}
                    className={`flex w-full items-start justify-between gap-4 rounded-md border px-4 py-4 text-left transition-colors sm:px-5 ${
                      selecionado ? "border-ouro bg-ouro/10" : "border-borda bg-card hover:border-borda-forte hover:bg-elevado"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-texto">{s.nome}</span>
                      {s.descricao && <span className="mt-0.5 block text-label text-texto-sec">{s.descricao}</span>}
                      <span className="mt-1 inline-flex items-center gap-1.5 text-label text-texto-sec">
                        <Clock className="size-3.5" aria-hidden />
                        {formatarDuracao(s.duracaoMinutos)}
                      </span>
                    </span>
                    <span className="numeros shrink-0 font-titulo text-subtitulo font-semibold text-texto">
                      {formatarPreco(s.precoCentavos)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Etapa>

        <Etapa
          numero={2}
          titulo="Barbeiro"
          situacao={situacao("barbeiro")}
          focarAoAbrir={interagiu}
          onAlterar={elegiveis.length > 1 ? () => irPara("barbeiro") : undefined}
          resumo={nomeBarbeiro}
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            <li>
              <OpcaoBarbeiro
                selecionado={barbeiro === "qualquer"}
                onClick={() => escolherBarbeiro("qualquer")}
                nome="Qualquer barbeiro"
                detalhe="Mostra todos os horários livres"
                avatar={<Users className="size-5" aria-hidden />}
              />
            </li>
            {elegiveis.map((b) => (
              <li key={b.id}>
                <OpcaoBarbeiro
                  selecionado={barbeiro === b.id}
                  onClick={() => escolherBarbeiro(b.id)}
                  nome={b.nome}
                  detalhe={b.bio}
                  avatar={<AvatarBarbeiro barbeiro={b} />}
                />
              </li>
            ))}
          </ul>
        </Etapa>

        <Etapa
          numero={3}
          titulo="Dia e horário"
          situacao={situacao("horario")}
          focarAoAbrir={interagiu}
          onAlterar={() => irPara("horario")}
          resumo={
            quando && (
              <span className="first-letter:uppercase">
                {quando}
                {barbeiro === "qualquer" && atendente ? `, com ${nomeDe(atendente)}` : ""}
              </span>
            )
          }
        >
          {dias.some((d) => d.atende) ? (
            <SeletorHorario
              dias={dias}
              data={data}
              onEscolherDia={escolherDia}
              resultado={resultado}
              carregando={carregando}
              escolhido={horario}
              onEscolherHorario={escolherHorario}
              nomes={barbeiro === "qualquer" ? Object.fromEntries(barbeiros.map((b) => [b.id, primeiroNome(b.nome)])) : undefined}
              onTentarDeNovo={() => data && servicoId && carregarHorarios(data, servicoId, barbeiroId)}
              onVerQualquer={barbeiroId && elegiveis.length > 1 ? () => escolherBarbeiro("qualquer") : undefined}
            />
          ) : (
            <p className="text-texto-sec">Não há dias com atendimento para esse serviço nas próximas semanas.</p>
          )}
          {precisaAtendente && horario && (
            <EscolhaAtendente
              hora={horario.hora}
              barbeiros={horario.barbeiroIds.map((id) => barbeiros.find((b) => b.id === id)).filter((b) => b !== undefined)}
              onEscolher={escolherAtendente}
            />
          )}
          {estado.horarioPerdido && estado.erro && !horario && (
            <div className="mt-5">
              <Aviso tipo="atencao">{estado.erro}</Aviso>
            </div>
          )}
        </Etapa>

        <Etapa numero={4} titulo="Seus dados" situacao={situacao("dados")} focarAoAbrir={interagiu}>
          {servico && horario && data && barbeiroFinal && (
            <form
              className="flex flex-col gap-6"
              noValidate
              onSubmit={(e) => {
                // Envio manual (e não action no form) para o React não limpar os campos quando há erro.
                e.preventDefault();
                const dadosForm = new FormData(e.currentTarget);
                startTransition(() => enviar(dadosForm));
              }}
            >
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="servicoId" value={servico.id} />
              <input type="hidden" name="barbeiroId" value={barbeiroFinal} />
              <input type="hidden" name="inicio" value={horario.inicio} />

              <Comanda servico={servico} barbeiro={nomeDe(barbeiroFinal)} quando={quando ?? ""} />

              <div className="grid gap-5 sm:grid-cols-2">
                <Campo
                  rotulo="Seu nome"
                  name="nome"
                  autoComplete="name"
                  required
                  maxLength={120}
                  erro={estado.campos?.nome}
                />
                <CampoWhatsapp erro={estado.campos?.whatsapp} />
              </div>

              <ConsentimentoLgpd nomeBarbearia={nomeBarbearia} erro={estado.campos?.lgpd} />

              {estado.erro && !estado.horarioPerdido && <Aviso tipo="erro">{estado.erro}</Aviso>}

              <Botao
                type="submit"
                tamanho="lg"
                carregando={enviando}
                textoCarregando="Confirmando..."
                icone={<CalendarCheck aria-hidden />}
                className="w-full sm:w-auto sm:self-start"
              >
                Confirmar agendamento
              </Botao>
            </form>
          )}
        </Etapa>
      </ol>
    </div>
  );
}

function AvatarBarbeiro({ barbeiro }: { barbeiro: Barbeiro }) {
  return barbeiro.fotoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- foto vem de URL livre cadastrada pela barbearia
    <img src={barbeiro.fotoUrl} alt="" className="size-full rounded-full object-cover" />
  ) : (
    <span className="font-titulo font-bold">{barbeiro.nome.trim()[0]?.toUpperCase()}</span>
  );
}

/** "Carlos (fictício)" -> "Carlos" */
function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Mais de um barbeiro livre no horário escolhido: o cliente diz com quem quer. */
function EscolhaAtendente({ hora, barbeiros, onEscolher }: { hora: string; barbeiros: Barbeiro[]; onEscolher: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { bottom } = el.getBoundingClientRect();
    if (bottom > window.innerHeight) {
      const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "nearest", behavior: reduzir ? "auto" : "smooth" });
    }
  }, [hora]);

  return (
    <div ref={ref} className="mt-6 rounded-md border border-ouro-discreto bg-card p-4 sm:p-5" role="group" aria-labelledby="titulo-atendente">
      <p id="titulo-atendente" className="font-medium text-texto">
        Às <span className="numeros">{hora}</span>, com quem você quer?
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {barbeiros.map((b) => (
          <li key={b.id}>
            <OpcaoBarbeiro
              selecionado={false}
              onClick={() => onEscolher(b.id)}
              nome={b.nome}
              detalhe={b.bio}
              avatar={<AvatarBarbeiro barbeiro={b} />}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResumoServico({ servico }: { servico: Servico }) {
  return (
    <span className="flex flex-wrap gap-x-3">
      <span className="text-texto">{servico.nome}</span>
      <span className="numeros">{formatarDuracao(servico.duracaoMinutos)}</span>
      <span className="numeros">{formatarPreco(servico.precoCentavos)}</span>
    </span>
  );
}

function OpcaoBarbeiro({
  selecionado,
  onClick,
  nome,
  detalhe,
  avatar,
}: {
  selecionado: boolean;
  onClick: () => void;
  nome: string;
  detalhe: string | null;
  avatar: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={onClick}
      className={`flex h-full w-full items-center gap-3.5 rounded-md border p-4 text-left transition-colors ${
        selecionado ? "border-ouro bg-ouro/10" : "border-borda bg-card hover:border-borda-forte hover:bg-elevado"
      }`}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-borda-forte bg-elevado text-ouro">
        {avatar}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-texto">{nome}</span>
        {detalhe && <span className="block text-label text-texto-sec">{detalhe}</span>}
      </span>
    </button>
  );
}

/** A comanda: o que foi escolhido, conferido antes de confirmar. */
function Comanda({ servico, barbeiro, quando }: { servico: Servico; barbeiro: string; quando: string }) {
  const linhas = [
    ["Serviço", servico.nome],
    ["Barbeiro", barbeiro],
    ["Quando", quando],
    ["Duração", formatarDuracao(servico.duracaoMinutos)],
  ];
  return (
    <div className="rounded-md border border-borda bg-card px-4 py-4 sm:px-5">
      <dl className="flex flex-col gap-2">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex justify-between gap-4">
            <dt className="text-texto-sec">{rotulo}</dt>
            <dd className="text-right text-texto first-letter:uppercase">{valor}</dd>
          </div>
        ))}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-dashed border-borda-forte pt-3">
          <dt className="font-medium">Total no local</dt>
          <dd className="numeros font-titulo text-secao font-bold text-ouro">{formatarPreco(servico.precoCentavos)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** "11912345678" -> "(11) 91234-5678", enquanto a pessoa digita. */
function mascaraWhatsapp(valor: string) {
  const d = valor.replace(/\D/g, "").replace(/^55(?=\d{11})/, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function CampoWhatsapp({ erro }: { erro?: string }) {
  const [valor, setValor] = useState("");
  return (
    <Campo
      rotulo="WhatsApp"
      name="whatsapp"
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="(11) 91234-5678"
      required
      value={valor}
      onChange={(e) => setValor(mascaraWhatsapp(e.target.value))}
      dica="A barbearia usa para confirmar ou avisar mudanças."
      erro={erro}
    />
  );
}

function ConsentimentoLgpd({ nomeBarbearia, erro }: { nomeBarbearia: string; erro?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex cursor-pointer items-start gap-3 text-base text-texto-sec">
        <input
          type="checkbox"
          name="lgpd"
          value="sim"
          required
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "erro-lgpd" : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--color-ouro)]"
        />
        <span>
          Autorizo a {nomeBarbearia} a usar meu nome e WhatsApp para este agendamento e para falar comigo sobre ele.
          Os dados ficam só com a barbearia, conforme a LGPD, e você pode pedir para apagar quando quiser.
        </span>
      </label>
      {erro && (
        <p id="erro-lgpd" className="pl-8 text-label text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
