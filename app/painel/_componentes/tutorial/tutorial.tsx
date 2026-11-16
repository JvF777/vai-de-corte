"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import type { Papel } from "@/lib/auth";
import { gsap, SEM_MOVIMENTO } from "@/components/animacao/gsap";
import { Botao } from "@/components/ui/botao";
import { EVENTO_TUTORIAL, pedirExemplo, pedirMenu } from "./eventos";
import { passosPara, type PassoTutorial } from "./passos";

/**
 * Passo a passo do painel: escurece a tela, destaca uma parte de cada vez e explica
 * em poucas palavras. Abre sozinho uma vez por usuário (guardado neste navegador)
 * e depois pelo botão "Ver tutorial" do menu.
 */

type Props = { usuarioId: string; papel: Papel | null; temBarbearia: boolean };

const chaveVisto = (usuarioId: string) => `vai-de-corte:tutorial-visto:${usuarioId}`;

function jaViu(usuarioId: string) {
  try {
    return localStorage.getItem(chaveVisto(usuarioId)) === "1";
  } catch {
    // Sem acesso ao armazenamento: melhor não abrir sozinho toda vez.
    return true;
  }
}

function marcarVisto(usuarioId: string) {
  try {
    localStorage.setItem(chaveVisto(usuarioId), "1");
  } catch {
    // Sem armazenamento, o tutorial só não fica lembrado.
  }
}

export function Tutorial({ usuarioId, papel, temBarbearia }: Props) {
  const passos = useMemo(() => passosPara(papel), [papel]);
  const [indice, setIndice] = useState<number | null>(null);
  const caminho = usePathname();
  // Ao terminar o cadastro o painel abre com ?nova=1 (o layout pode ainda achar que não há barbearia).
  const recemCriada = useSearchParams().get("nova") === "1";
  const abriuSozinho = useRef(false);

  // Primeira vez: abre sozinho, depois que a página terminou de aparecer.
  useEffect(() => {
    if (abriuSozinho.current || (!temBarbearia && !recemCriada)) return;
    if (caminho.startsWith("/painel/nova-barbearia") || jaViu(usuarioId)) return;
    const id = window.setTimeout(() => {
      abriuSozinho.current = true;
      setIndice(0);
    }, 900);
    return () => window.clearTimeout(id);
  }, [temBarbearia, recemCriada, caminho, usuarioId]);

  useEffect(() => {
    const abrir = () => setIndice(0);
    window.addEventListener(EVENTO_TUTORIAL, abrir);
    return () => window.removeEventListener(EVENTO_TUTORIAL, abrir);
  }, []);

  const fechar = useCallback(() => {
    marcarVisto(usuarioId);
    setIndice(null);
  }, [usuarioId]);

  if (indice === null) return null;
  return <Sobreposicao passos={passos} indice={indice} aoMudar={setIndice} aoFechar={fechar} />;
}

type Mostrado = { indice: number; alvo: HTMLElement | null };

const MARGEM = 16;
const FOLGA = 14;
const RECUO = 6;

function visivel(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

/** O mesmo alvo existe na barra do computador e na gaveta do celular: pega o que está na tela. */
function acharAlvo(nome: string) {
  const todos = document.querySelectorAll<HTMLElement>(`[data-tutorial="${CSS.escape(nome)}"]`);
  return Array.from(todos).find(visivel) ?? null;
}

const quadro = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Espera o alvo aparecer (troca de página, menu abrindo) e parar de se mexer. */
async function esperarAlvo(nome: string, cancelado: () => boolean) {
  const limite = performance.now() + 5000;
  let anterior = "";
  let iguais = 0;
  while (performance.now() < limite) {
    await quadro();
    if (cancelado()) return null;
    const el = acharAlvo(nome);
    if (!el) {
      iguais = 0;
      continue;
    }
    const r = el.getBoundingClientRect();
    const agora = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`;
    iguais = agora === anterior ? iguais + 1 : 0;
    anterior = agora;
    if (iguais >= 3) return el;
  }
  return acharAlvo(nome);
}

async function esperarParar(el: HTMLElement, cancelado: () => boolean) {
  let anterior = "";
  for (let i = 0; i < 40; i++) {
    await quadro();
    if (cancelado()) return;
    const r = el.getBoundingClientRect();
    const agora = `${Math.round(r.left)},${Math.round(r.top)}`;
    if (agora === anterior) return;
    anterior = agora;
  }
}

function Sobreposicao({
  passos,
  indice,
  aoMudar,
  aoFechar,
}: {
  passos: PassoTutorial[];
  indice: number;
  aoMudar: (i: number) => void;
  aoFechar: () => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const foco = useRef<HTMLDivElement>(null);
  const cartao = useRef<HTMLDivElement>(null);
  const miolo = useRef<HTMLDivElement>(null);
  const principal = useRef<HTMLButtonElement>(null);
  const alvoAtual = useRef<HTMLElement | null>(null);
  const [mostrado, setMostrado] = useState<Mostrado | null>(null);
  const caminho = usePathname();
  const caminhoAtual = useRef(caminho);
  const router = useRouter();
  const idTitulo = useId();
  const idTexto = useId();

  useLayoutEffect(() => {
    caminhoAtual.current = caminho;
  }, [caminho]);

  const duracao = useCallback((s: number) => (window.matchMedia(SEM_MOVIMENTO).matches ? 0 : s), []);
  const ehCelular = () => !window.matchMedia("(min-width: 1024px)").matches;

  /** Coloca o recorte em volta do alvo e o cartão onde couber. */
  const posicionar = useCallback(
    (animar: boolean) => {
      const f = foco.current;
      const c = cartao.current;
      if (!f || !c) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const el = alvoAtual.current;
      const d = animar ? duracao(0.45) : 0;
      const cw = c.offsetWidth;
      const ch = c.offsetHeight;
      const limitarX = (x: number) => Math.min(Math.max(x, MARGEM), vw - cw - MARGEM);
      const limitarY = (y: number) => Math.min(Math.max(y, MARGEM), vh - ch - MARGEM);

      if (!el || !visivel(el)) {
        gsap.to(f, { x: vw / 2, y: vh / 2, width: 0, height: 0, outlineColor: "rgba(200,169,107,0)", duration: d, ease: "power3.inOut" });
        gsap.to(c, { x: limitarX((vw - cw) / 2), y: limitarY((vh - ch) / 2), duration: d, ease: "power3.inOut" });
        return;
      }

      const b = el.getBoundingClientRect();
      const x1 = Math.max(8, b.left - RECUO);
      const y1 = Math.max(8, b.top - RECUO);
      const x2 = Math.min(vw - 8, b.right + RECUO);
      const y2 = Math.min(vh - 8, b.bottom + RECUO);
      gsap.to(f, {
        x: x1,
        y: y1,
        width: Math.max(0, x2 - x1),
        height: Math.max(0, y2 - y1),
        outlineColor: "rgba(200,169,107,0.9)",
        duration: d,
        ease: "power3.inOut",
      });

      let x: number;
      let y: number;
      if (!ehCelular() && b.right < vw * 0.4 && x2 + FOLGA + cw <= vw - MARGEM) {
        // Item da barra lateral: o cartão fica ao lado.
        x = x2 + FOLGA;
        y = limitarY(b.top + b.height / 2 - ch / 2);
      } else if (y2 + FOLGA + ch <= vh - MARGEM) {
        x = limitarX(b.left);
        y = y2 + FOLGA;
      } else if (y1 - FOLGA - ch >= MARGEM) {
        x = limitarX(b.left);
        y = y1 - FOLGA - ch;
      } else {
        // Alvo grande (a grade da agenda): o cartão fica por cima, embaixo da tela.
        x = limitarX((vw - cw) / 2);
        y = vh - ch - MARGEM;
      }
      gsap.to(c, { x, y, duration: d, ease: "power3.inOut" });
    },
    [duracao],
  );

  // Entrada da camada escura.
  useLayoutEffect(() => {
    const f = foco.current;
    if (f) gsap.set(f, { x: window.innerWidth / 2, y: window.innerHeight / 2, width: 0, height: 0 });
    gsap.fromTo(raiz.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: duracao(0.3) });
  }, [duracao]);

  // Troca de passo: vai para a página e abre o menu se precisar, espera o alvo e mostra.
  useEffect(() => {
    const passo = passos[indice];
    let cancelado = false;
    const foiCancelado = () => cancelado;
    if (miolo.current) gsap.to(miolo.current, { autoAlpha: 0, y: 6, duration: duracao(0.15) });

    if (passo.rota && caminhoAtual.current !== passo.rota) router.push(passo.rota, { scroll: false });
    if (ehCelular()) pedirMenu(Boolean(passo.noMenu));
    pedirExemplo(Boolean(passo.exemplo));

    void (async () => {
      const el = passo.alvo ? await esperarAlvo(passo.alvo, foiCancelado) : null;
      if (cancelado) return;
      if (el) {
        const r = el.getBoundingClientRect();
        // Alvo grande, ou no celular fora do menu: sobe o alvo para o cartão caber embaixo dele.
        if (r.height > window.innerHeight * 0.6 || (ehCelular() && !passo.noMenu)) window.scrollBy({ top: r.top - 72 });
        else el.scrollIntoView({ block: "center", inline: "nearest" });
        await esperarParar(el, foiCancelado);
        if (cancelado) return;
      }
      setMostrado({ indice, alvo: el });
    })();

    return () => {
      cancelado = true;
    };
  }, [indice, passos, router, duracao]);

  useLayoutEffect(() => {
    if (!mostrado) return;
    alvoAtual.current = mostrado.alvo;
    posicionar(true);
    if (miolo.current) gsap.fromTo(miolo.current, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: duracao(0.3), delay: duracao(0.12) });
    principal.current?.focus({ preventScroll: true });
  }, [mostrado, posicionar, duracao]);

  // Rolagem e giro de tela: o recorte acompanha o alvo.
  useEffect(() => {
    let pedido = 0;
    const aoMexer = () => {
      cancelAnimationFrame(pedido);
      pedido = requestAnimationFrame(() => posicionar(false));
    };
    window.addEventListener("resize", aoMexer);
    window.addEventListener("scroll", aoMexer, true);
    return () => {
      cancelAnimationFrame(pedido);
      window.removeEventListener("resize", aoMexer);
      window.removeEventListener("scroll", aoMexer, true);
    };
  }, [posicionar]);

  const terminar = useCallback(() => {
    if (ehCelular()) pedirMenu(false);
    pedirExemplo(false);
    gsap.to(raiz.current, { autoAlpha: 0, duration: duracao(0.2), onComplete: aoFechar });
  }, [aoFechar, duracao]);

  const ultimo = indice === passos.length - 1;
  const avancar = useCallback(() => (ultimo ? terminar() : aoMudar(indice + 1)), [ultimo, terminar, aoMudar, indice]);
  const voltar = useCallback(() => indice > 0 && aoMudar(indice - 1), [indice, aoMudar]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        terminar();
      } else if (e.key === "ArrowRight") avancar();
      else if (e.key === "ArrowLeft") voltar();
      else if (e.key === "Tab" && cartao.current) {
        // O foco fica preso nos botões do cartão.
        const botoes = Array.from(cartao.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
        if (!botoes.length) return;
        const i = botoes.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        const proximo = e.shiftKey ? (i <= 0 ? botoes.length - 1 : i - 1) : i === -1 || i === botoes.length - 1 ? 0 : i + 1;
        botoes[proximo].focus();
      }
    };
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [terminar, avancar, voltar]);

  const exibido = passos[mostrado?.indice ?? indice];
  const numero = (mostrado?.indice ?? indice) + 1;
  const primeiro = (mostrado?.indice ?? indice) === 0;
  const fim = (mostrado?.indice ?? indice) === passos.length - 1;

  return (
    <div
      ref={raiz}
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
      aria-describedby={idTexto}
      className="invisible fixed inset-0 z-[60]"
    >
      {/* Segura os cliques: durante o tutorial a página só é mostrada. */}
      <div className="absolute inset-0" aria-hidden />
      <div
        ref={foco}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 rounded-[10px] shadow-[0_0_0_200vmax_rgb(11_11_13/0.8)] outline outline-1 outline-offset-0 outline-transparent"
      />

      <div ref={cartao} className="fixed left-0 top-0 w-[min(22rem,calc(100vw-2rem))]">
        <div ref={miolo} className="invisible rounded-md border border-borda-forte bg-card p-5 text-texto shadow-flutuante">
          <div className="flex items-center justify-between gap-3">
            <p className="numeros text-label font-medium text-ouro">
              {primeiro ? "Passo a passo" : `${numero - 1} de ${passos.length - 1}`}
            </p>
            <button
              type="button"
              onClick={terminar}
              aria-label="Fechar tutorial"
              className="-mr-2 -mt-2 flex size-9 items-center justify-center rounded-sm text-texto-sec hover:bg-elevado hover:text-texto"
            >
              <X className="size-[18px]" aria-hidden />
            </button>
          </div>

          {!primeiro && (
            <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-borda" aria-hidden>
              <div
                className="h-full origin-left rounded-full bg-ouro transition-transform duration-500 ease-saida"
                style={{ transform: `scaleX(${(numero - 1) / (passos.length - 1)})` }}
              />
            </div>
          )}

          <h2 id={idTitulo} className="mt-3 font-titulo text-subtitulo font-semibold">
            {exibido.titulo}
          </h2>
          <p id={idTexto} className="mt-1.5 text-texto-sec">
            {exibido.texto}
          </p>

          <div className="mt-5 flex items-center justify-between gap-2">
            {primeiro ? (
              <Botao variante="fantasma" onClick={terminar} className="-ml-2">
                Agora não
              </Botao>
            ) : (
              <Botao variante="fantasma" onClick={voltar} icone={<ArrowLeft aria-hidden />} className="-ml-2">
                Voltar
              </Botao>
            )}
            <Botao
              ref={principal}
              onClick={avancar}
              icone={fim ? <Check aria-hidden /> : primeiro ? undefined : <ArrowRight aria-hidden />}
              className="flex-row-reverse"
            >
              {primeiro ? "Começar" : fim ? "Entendi" : "Próximo"}
            </Botao>
          </div>
        </div>
      </div>
    </div>
  );
}
