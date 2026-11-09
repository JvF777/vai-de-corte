"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Info, LoaderCircle, Plus, Store, Trash2 } from "lucide-react";
import { Revelar } from "@/components/animacao/revelar";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Caixa } from "@/components/ui/caixa";
import { Campo } from "@/components/ui/campo";
import { CampoPreco } from "@/components/ui/campo-preco";
import { Painel } from "@/components/ui/painel";
import { Selecao } from "@/components/ui/selecao";
import { DURACOES, gerarSlug, MAX_BARBEIROS, MAX_SERVICOS, passoDoCampo } from "@/lib/cadastro";
import { formatarDuracao } from "@/lib/formatos";
import { GradeSemana, type HorarioDia } from "../../_componentes/grade-semana";
import { criarBarbearia, verificarLink, type EstadoNovaBarbearia, type SituacaoLink } from "../actions";

const PASSOS = [
  { titulo: "Sua barbearia", texto: "Como o cliente vai encontrar e falar com você." },
  { titulo: "Dias e horários", texto: "Quando a barbearia abre. O link só oferece horários dentro disso." },
  { titulo: "Serviços", texto: "O que o cliente pode marcar, com preço e quanto tempo leva." },
  { titulo: "Quem atende", texto: "Cada barbeiro tem a própria agenda. Comece por você, se também corta." },
] as const;

/** Segunda a sábado, 9h às 19h: ponto de partida comum, o dono ajusta. */
const HORARIO_INICIAL: Partial<Record<number, HorarioDia>> = Object.fromEntries(
  [1, 2, 3, 4, 5, 6].map((d) => [d, { inicio: "09:00", fim: d === 6 ? "17:00" : "19:00" }]),
);

type Linha = { id: number; nome?: string; preco?: string; duracao?: number };
/** Serviço como está na tela: id da linha (estável), posição da linha no formulário e nome. */
type ServicoNaTela = { id: number; linha: number; nome: string };

function lerServicosDaTela(form: HTMLFormElement): ServicoNaTela[] {
  return Array.from(form.querySelectorAll<HTMLElement>("[data-servico-linha]")).flatMap((li, linha) => {
    const nome = li.querySelector<HTMLInputElement>('input[name="servico_nome"]')?.value.trim() ?? "";
    return nome ? [{ id: Number(li.dataset.servicoLinha), linha, nome }] : [];
  });
}

const estadoInicial: EstadoNovaBarbearia = { erro: null, tentativa: 0 };
const semAssinatura = () => () => {};

export function Assistente({ nomeDono }: { nomeDono: string }) {
  const [estado, enviar, pendente] = useActionState(criarBarbearia, estadoInicial);
  const [passo, setPasso] = useState(0);
  const formulario = useRef<HTMLFormElement>(null);
  const passos = useRef<(HTMLFieldSetElement | null)[]>([]);
  const titulo = useRef<HTMLHeadingElement>(null);
  const campos = estado.campos ?? {};

  // Erro do servidor: volta para o primeiro passo que tem campo com problema.
  useEffect(() => {
    const chaves = Object.keys(estado.campos ?? {});
    if (!chaves.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reage à resposta do servidor
    setPasso(Math.min(...chaves.map(passoDoCampo)));
  }, [estado]);

  // Serviços do passo 3, lidos da tela ao entrar no passo 4 (para marcar quem faz o quê).
  const [servicosAtuais, setServicosAtuais] = useState<ServicoNaTela[]>([]);

  function irPara(novo: number) {
    if (novo === 3 && formulario.current) setServicosAtuais(lerServicosDaTela(formulario.current));
    setPasso(novo);
    requestAnimationFrame(() => {
      titulo.current?.focus({ preventScroll: true });
      formulario.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /** Confere os campos obrigatórios do passo atual antes de avançar. */
  function passoValido() {
    const grupo = passos.current[passo];
    if (!grupo) return true;
    const elementos = Array.from(grupo.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select"));
    const invalido = elementos.find((el) => !el.checkValidity());
    if (invalido) {
      invalido.reportValidity();
      return false;
    }
    if (passo === 1 && !grupo.querySelector<HTMLInputElement>('input[name^="aberto_"]:checked')) {
      alertaDias.current?.removeAttribute("hidden");
      return false;
    }
    return true;
  }
  const alertaDias = useRef<HTMLParagraphElement>(null);

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passoValido()) return;
    if (passo < PASSOS.length - 1) return irPara(passo + 1);
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  }

  const ultimo = passo === PASSOS.length - 1;

  return (
    <form ref={formulario} onSubmit={aoEnviar} noValidate className="scroll-mt-24">
      <Progresso passo={passo} />

      <Painel className="mt-6 p-5 sm:p-8">
        <div className="mb-6">
          <p className="text-label font-medium text-ouro">
            Passo {passo + 1} de {PASSOS.length}
          </p>
          <h2 ref={titulo} tabIndex={-1} className="mt-1 font-titulo text-secao font-semibold focus:outline-none">
            {PASSOS[passo].titulo}
          </h2>
          <p className="mt-1 text-texto-sec">{PASSOS[passo].texto}</p>
        </div>

        {/* Todos os passos ficam no formulário (escondidos), assim nada se perde ao voltar. */}
        <fieldset ref={(el) => void (passos.current[0] = el)} hidden={passo !== 0} className="min-w-0">
          <legend className="sr-only">{PASSOS[0].titulo}</legend>
          <PassoDados campos={campos} />
        </fieldset>

        <fieldset ref={(el) => void (passos.current[1] = el)} hidden={passo !== 1} className="min-w-0">
          <legend className="sr-only">{PASSOS[1].titulo}</legend>
          <GradeSemana valores={HORARIO_INICIAL} comAlmoco={false} erros={campos} rotuloFora="Fechado" />
          <p ref={alertaDias} hidden={!campos.horarios} role="alert" className="mt-3 flex items-center gap-2 text-label text-erro">
            <CircleAlert className="size-4" aria-hidden />
            {campos.horarios ?? "Marque pelo menos um dia em que a barbearia abre."}
          </p>
          <Explicacao titulo="Como funcionam esses horários">
            <li>Marque os dias em que a barbearia abre e o horário de abrir e de fechar.</li>
            <li>O cliente só consegue marcar dentro desse horário, de 30 em 30 minutos.</li>
            <li>Todos os barbeiros começam trabalhando nesse mesmo horário.</li>
            <li>
              Almoço, folga fixa de um barbeiro (por exemplo, toda segunda) e férias você ajusta depois em{" "}
              <strong className="font-medium text-texto">Painel &gt; Barbeiros</strong>, tocando no nome do barbeiro.
            </li>
            <li>
              Feriado ou um dia que vai fechar: <strong className="font-medium text-texto">Agenda &gt; Bloquear horário</strong>.
            </li>
          </Explicacao>
        </fieldset>

        <fieldset ref={(el) => void (passos.current[2] = el)} hidden={passo !== 2} className="min-w-0">
          <legend className="sr-only">{PASSOS[2].titulo}</legend>
          <PassoServicos campos={campos} />
        </fieldset>

        <fieldset ref={(el) => void (passos.current[3] = el)} hidden={passo !== 3} className="min-w-0">
          <legend className="sr-only">{PASSOS[3].titulo}</legend>
          <PassoBarbeiros campos={campos} nomeDono={nomeDono} servicos={servicosAtuais} />
        </fieldset>

        {estado.erro && !pendente && (
          <div className="mt-6">
            <Aviso tipo="erro">{estado.erro}</Aviso>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-borda pt-6 sm:flex-row sm:items-center sm:justify-between">
          {passo > 0 ? (
            <Botao type="button" variante="fantasma" icone={<ArrowLeft aria-hidden />} onClick={() => irPara(passo - 1)} disabled={pendente}>
              Voltar
            </Botao>
          ) : (
            <span />
          )}
          <Botao
            type="submit"
            tamanho="lg"
            carregando={pendente}
            textoCarregando="Criando a barbearia..."
            icone={ultimo ? <Store aria-hidden /> : undefined}
          >
            {ultimo ? "Criar minha barbearia" : "Continuar"}
            {!ultimo && <ArrowRight aria-hidden />}
          </Botao>
        </div>
      </Painel>
    </form>
  );
}

function Progresso({ passo }: { passo: number }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Etapas do cadastro">
      {PASSOS.map((p, i) => {
        const feito = i < passo;
        const atual = i === passo;
        return (
          <li key={p.titulo} aria-current={atual ? "step" : undefined} className="flex min-w-0 flex-col gap-2">
            <span className={`h-1 rounded-full transition-colors duration-300 ${i <= passo ? "bg-ouro" : "bg-borda"}`} />
            <span className={`hidden items-center gap-1.5 truncate text-label sm:flex ${atual ? "text-texto" : "text-texto-disc"}`}>
              {feito && <Check className="size-3.5 shrink-0 text-ouro" aria-hidden />}
              {p.titulo}
            </span>
            <span className="sr-only">{feito ? "concluído" : atual ? "atual" : "a fazer"}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Passo 1: dados e link
// ---------------------------------------------------------------------------
function PassoDados({ campos }: { campos: Record<string, string> }) {
  const origem = useSyncExternalStore(semAssinatura, () => window.location.host, () => "");
  const [slug, setSlug] = useState("");
  const [editado, setEditado] = useState(false);
  const [situacao, setSituacao] = useState<SituacaoLink | "conferindo" | null>(null);

  // Confere se o link está livre um instante depois de parar de digitar.
  useEffect(() => {
    if (slug.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpa o aviso enquanto o link é curto
      setSituacao(null);
      return;
    }
    setSituacao("conferindo");
    let vale = true;
    const t = setTimeout(async () => {
      const r = await verificarLink(slug);
      if (vale) setSituacao(r);
    }, 450);
    return () => {
      vale = false;
      clearTimeout(t);
    };
  }, [slug]);

  const erroSlug =
    campos.slug ?? (situacao === "ocupado" ? "Esse link já é de outra barbearia. Tente com o bairro ou a cidade." : null);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Campo
          rotulo="Nome da barbearia"
          name="nome"
          required
          minLength={2}
          maxLength={120}
          autoComplete="organization"
          placeholder="Ex.: Barbearia do Zé"
          erro={campos.nome}
          onChange={(e) => {
            if (!editado) setSlug(gerarSlug(e.target.value));
          }}
        />
      </div>

      <div className="sm:col-span-2">
        <Campo
          rotulo="Link de agendamento"
          name="slug"
          required
          minLength={3}
          maxLength={60}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          autoCapitalize="none"
          spellCheck={false}
          value={slug}
          onChange={(e) => {
            setEditado(true);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-"));
          }}
          onBlur={() => setSlug((s) => s.replace(/^-+|-+$/g, ""))}
          dica={`${origem || "vaidecorte"}/barbearia/${slug || "nome-da-barbearia"}`}
          erro={erroSlug}
        />
        <p className="mt-1.5 flex min-h-5 items-center gap-1.5 text-label" aria-live="polite">
          {situacao === "conferindo" && (
            <>
              <LoaderCircle className="size-3.5 animate-spin text-texto-disc" aria-hidden />
              <span className="text-texto-disc">Conferindo...</span>
            </>
          )}
          {situacao === "livre" && !campos.slug && (
            <>
              <Check className="size-3.5 text-ouro" aria-hidden />
              <span className="text-texto-sec">Link livre. É ele que vai na bio do Instagram.</span>
            </>
          )}
          {situacao === "invalido" && <span className="text-texto-disc">Use letras sem acento, números e hífens.</span>}
        </p>
      </div>

      <Campo
        rotulo="WhatsApp da barbearia"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required
        pattern="[\d\s()+\-]{10,20}"
        placeholder="(11) 91234-5678"
        dica="Aparece no botão de WhatsApp do link."
        erro={campos.whatsapp}
      />
      <Campo rotulo="Endereço (opcional)" name="endereco" maxLength={300} autoComplete="street-address" placeholder="Rua, número, bairro" erro={campos.endereco} />
      <Campo rotulo="Cidade (opcional)" name="cidade" maxLength={100} autoComplete="address-level2" erro={campos.cidade} />
      <Campo
        rotulo="Estado (opcional)"
        name="uf"
        maxLength={2}
        autoComplete="address-level1"
        autoCapitalize="characters"
        placeholder="SP"
        className="uppercase"
        erro={campos.uf}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passo 3: serviços
// ---------------------------------------------------------------------------
function PassoServicos({ campos }: { campos: Record<string, string> }) {
  const proximo = useRef(3);
  const [linhas, setLinhas] = useState<Linha[]>([
    { id: 1, nome: "Corte", preco: "40,00", duracao: 30 },
    { id: 2, nome: "Barba", preco: "30,00", duracao: 30 },
  ]);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {linhas.map((l, i) => (
          <li key={l.id} data-servico-linha={l.id}>
            <Revelar className="grid gap-3 rounded-sm border border-borda bg-superficie p-4 sm:grid-cols-[minmax(0,1fr)_9rem_9.5rem_auto] sm:items-start">
              <Campo rotulo="Serviço" name="servico_nome" required minLength={2} maxLength={80} defaultValue={l.nome} placeholder="Ex.: Corte degradê" erro={campos[`servico_nome_${i}`]} />
              <CampoPreco rotulo="Preço" name="servico_preco" required pattern="(R\$\s?)?[\d.]+(,\d{1,2})?" defaultValue={l.preco} placeholder="40,00" erro={campos[`servico_preco_${i}`]} />
              <Selecao rotulo="Duração" name="servico_duracao" defaultValue={l.duracao ?? 30} erro={campos[`servico_duracao_${i}`]}>
                {DURACOES.map((d) => (
                  <option key={d} value={d}>
                    {formatarDuracao(d)}
                  </option>
                ))}
              </Selecao>
              <Botao
                type="button"
                variante="fantasma"
                className="self-end sm:mt-[1.6rem]"
                aria-label={`Remover serviço ${i + 1}`}
                icone={<Trash2 aria-hidden />}
                disabled={linhas.length === 1}
                onClick={() => setLinhas((ls) => ls.filter((x) => x.id !== l.id))}
              >
                <span className="sm:sr-only">Remover</span>
              </Botao>
            </Revelar>
          </li>
        ))}
      </ul>
      {campos.servicos && <p className="text-label text-erro">{campos.servicos}</p>}
      {linhas.length < MAX_SERVICOS && (
        <Botao
          type="button"
          variante="secundario"
          className="self-start"
          icone={<Plus aria-hidden />}
          onClick={() => setLinhas((ls) => [...ls, { id: proximo.current++, duracao: 30 }])}
        >
          Adicionar serviço
        </Botao>
      )}
      <Explicacao titulo="Como funcionam os serviços">
        <li>O nome e o preço aparecem para o cliente no link de agendamento.</li>
        <li>A duração é quanto tempo a agenda do barbeiro fica ocupada. Um corte de 30 min marcado às 10h libera o horário às 10h30.</li>
        <li>
          Quem faz cada serviço você escolhe no próximo passo. A descrição de cada um você coloca depois em{" "}
          <strong className="font-medium text-texto">Painel &gt; Serviços</strong>.
        </li>
      </Explicacao>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passo 4: barbeiros
// ---------------------------------------------------------------------------
function PassoBarbeiros({
  campos,
  nomeDono,
  servicos,
}: {
  campos: Record<string, string>;
  nomeDono: string;
  servicos: ServicoNaTela[];
}) {
  const proximo = useRef(2);
  const [souBarbeiro, setSouBarbeiro] = useState(true);
  const [linhas, setLinhas] = useState<Linha[]>([{ id: 1, nome: nomeDono }]);

  return (
    <div className="flex flex-col gap-4">
      <Caixa
        name="sou_eu"
        value="0"
        checked={souBarbeiro}
        onChange={(e) => setSouBarbeiro(e.target.checked)}
        rotulo="Eu também corto cabelo aqui"
        dica="Você vira o primeiro barbeiro e vê a sua própria agenda no painel."
      />
      {servicos.length > 0 && <input type="hidden" name="escolhe_servicos" value="sim" />}
      <ul className="flex flex-col gap-3">
        {linhas.map((l, i) => {
          const ehVoce = souBarbeiro && i === 0;
          const erroServicos = campos[`barbeiro_servicos_${i}`];
          return (
            <li key={l.id} className="rounded-sm border border-borda bg-superficie p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <Campo
                  rotulo={ehVoce ? "Seu nome como barbeiro" : `Barbeiro ${i + 1}`}
                  name="barbeiro_nome"
                  required
                  minLength={2}
                  maxLength={80}
                  defaultValue={l.nome}
                  placeholder="Ex.: Carlos"
                  erro={campos[`barbeiro_nome_${i}`]}
                />
                <Botao
                  type="button"
                  variante="fantasma"
                  className="mt-[1.6rem]"
                  aria-label={`Remover barbeiro ${i + 1}`}
                  icone={<Trash2 aria-hidden />}
                  disabled={linhas.length === 1}
                  onClick={() => setLinhas((ls) => ls.filter((x) => x.id !== l.id))}
                />
              </div>
              {servicos.length > 0 && (
                <fieldset className="mt-4 min-w-0">
                  <legend className="text-label font-medium text-texto-sec">{ehVoce ? "Serviços que você faz" : "Serviços que faz"}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {servicos.map((s) => (
                      <label key={`${l.id}-${s.id}`} className="cursor-pointer">
                        <input
                          type="checkbox"
                          name={`barbeiro_servicos_${i}`}
                          value={s.linha}
                          defaultChecked
                          className="peer sr-only"
                        />
                        <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-borda-campo px-3.5 text-base text-texto-sec transition-colors hover:border-texto-disc peer-checked:border-ouro peer-checked:bg-ouro/10 peer-checked:text-texto peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ouro [&>svg]:hidden peer-checked:[&>svg]:block">
                          <Check className="size-3.5 text-ouro" aria-hidden />
                          {s.nome}
                        </span>
                      </label>
                    ))}
                  </div>
                  {erroServicos && <p className="mt-2 text-label text-erro">{erroServicos}</p>}
                </fieldset>
              )}
            </li>
          );
        })}
      </ul>
      {campos.barbeiros && <p className="text-label text-erro">{campos.barbeiros}</p>}
      {campos.barbeiros_cobertura && <p className="text-label text-erro">{campos.barbeiros_cobertura}</p>}
      {linhas.length < MAX_BARBEIROS && (
        <Botao
          type="button"
          variante="secundario"
          className="self-start"
          icone={<Plus aria-hidden />}
          onClick={() => setLinhas((ls) => [...ls, { id: proximo.current++ }])}
        >
          Adicionar barbeiro
        </Botao>
      )}
      <Explicacao titulo="Como funciona a equipe">
        <li>Cada barbeiro tem a própria agenda. O cliente escolhe com quem quer cortar, ou &quot;qualquer um disponível&quot;.</li>
        <li>
          Toque num serviço para tirar ou pôr. Se um barbeiro não faz luzes, por exemplo, desmarque: o cliente que escolher
          luzes não vai ver esse barbeiro.
        </li>
        <li>Todos trabalham no horário da barbearia.</li>
        <li>
          Foto, apresentação, almoço e folgas de cada um você muda depois em{" "}
          <strong className="font-medium text-texto">Painel &gt; Barbeiros</strong>.
        </li>
      </Explicacao>
    </div>
  );
}

/** Caixa de ajuda de cada passo: o que o campo significa e onde ajustar depois. */
function Explicacao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-sm border border-borda bg-superficie p-4 sm:p-5">
      <p className="flex items-center gap-2 font-medium text-texto">
        <Info className="size-4 shrink-0 text-ouro" aria-hidden />
        {titulo}
      </p>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-label text-texto-sec marker:text-ouro-discreto">{children}</ul>
    </div>
  );
}
