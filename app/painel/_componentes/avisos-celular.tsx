"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Share } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { removerInscricaoPush, salvarInscricaoPush, testarAvisoPush } from "../actions";

/**
 * Liga e desliga, neste aparelho, a notificação de agendamento novo (Web Push).
 * Aparece na barra lateral do painel (no celular, dentro do menu).
 */

const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
/** Avisa as outras cópias do componente (sidebar e gaveta do celular) que algo mudou. */
const EVENTO = "vai-de-corte:avisos";

type Estado =
  | "carregando"
  | "sem-chave"
  | "sem-suporte"
  | "instalar-iphone"
  | "bloqueado"
  | "desligado"
  | "ligado";

function ehIphone() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function instalado() {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
}

function suportaPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** A chave VAPID vem em base64url; o navegador quer os bytes. */
function chaveEmBytes(base64url: string) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const texto = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(texto.length));
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}

function nomeDoAparelho() {
  const ua = navigator.userAgent;
  const sistema = /Android/.test(ua) ? "Android" : ehIphone() ? "iPhone" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Computador";
  const navegador = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung" : /Firefox/.test(ua) ? "Firefox" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "navegador";
  return `${sistema} · ${navegador}`;
}

// Registro do service worker e sincronização com o servidor uma vez por carregamento,
// mesmo com duas cópias do componente na tela.
let registro: Promise<ServiceWorkerRegistration> | null = null;
function registrar() {
  registro ??= navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return registro;
}
let sincronizado = false;

async function lerEstado(): Promise<{ estado: Estado; inscricao: PushSubscription | null }> {
  if (!CHAVE_PUBLICA) return { estado: "sem-chave", inscricao: null };
  if (!suportaPush()) {
    // No iPhone o Web Push só existe com o app instalado na tela de início (iOS 16.4+).
    return { estado: ehIphone() && !instalado() ? "instalar-iphone" : "sem-suporte", inscricao: null };
  }
  if (Notification.permission === "denied") return { estado: "bloqueado", inscricao: null };
  const reg = await registrar();
  const inscricao = await reg.pushManager.getSubscription();
  if (inscricao && Notification.permission === "granted") {
    if (!sincronizado) {
      // Garante que o servidor conhece este aparelho (ex.: trocou de login no mesmo celular).
      sincronizado = true;
      void salvarInscricaoPush({ ...inscricao.toJSON(), aparelho: nomeDoAparelho() });
    }
    return { estado: "ligado", inscricao };
  }
  return { estado: "desligado", inscricao: null };
}

export function AvisosCelular() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [inscricao, setInscricao] = useState<PushSubscription | null>(null);
  const [ocupado, setOcupado] = useState<null | "ligar" | "desligar" | "testar">(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const atualizar = useCallback(async () => {
    try {
      const r = await lerEstado();
      setEstado(r.estado);
      setInscricao(r.inscricao);
    } catch (e) {
      console.error(e);
      setEstado("sem-suporte");
    }
  }, []);

  useEffect(() => {
    // Lê o estado do navegador depois de montar (não existe no servidor).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void atualizar();
    const aoMudar = () => void atualizar();
    window.addEventListener(EVENTO, aoMudar);
    return () => window.removeEventListener(EVENTO, aoMudar);
  }, [atualizar]);

  const avisarOutras = () => window.dispatchEvent(new Event(EVENTO));

  async function ligar() {
    setOcupado("ligar");
    setMensagem(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "desligado");
        if (permissao === "default") setMensagem({ tipo: "erro", texto: "Toque em Permitir quando o navegador perguntar." });
        return;
      }
      const reg = await registrar();
      const nova =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(CHAVE_PUBLICA) }));
      const r = await salvarInscricaoPush({ ...nova.toJSON(), aparelho: nomeDoAparelho() });
      if (!r.ok) {
        setMensagem({ tipo: "erro", texto: r.erro });
        return;
      }
      sincronizado = true;
      setMensagem({ tipo: "ok", texto: "Pronto! Cada agendamento novo pelo link vai aparecer aqui." });
      avisarOutras();
    } catch (e) {
      console.error(e);
      setMensagem({ tipo: "erro", texto: "Não foi possível ligar os avisos neste navegador." });
    } finally {
      setOcupado(null);
    }
  }

  async function desligar() {
    if (!inscricao) return;
    setOcupado("desligar");
    setMensagem(null);
    try {
      await removerInscricaoPush(inscricao.endpoint);
      await inscricao.unsubscribe();
      avisarOutras();
    } catch (e) {
      console.error(e);
      setMensagem({ tipo: "erro", texto: "Não foi possível desligar agora." });
    } finally {
      setOcupado(null);
    }
  }

  async function testar() {
    if (!inscricao) return;
    setOcupado("testar");
    setMensagem(null);
    const r = await testarAvisoPush(inscricao.endpoint);
    setMensagem(r.ok ? { tipo: "ok", texto: r.mensagem ?? "Teste enviado." } : { tipo: "erro", texto: r.erro });
    setOcupado(null);
  }

  if (estado === "carregando") return <div className="h-[7.5rem] rounded-sm border border-borda" aria-hidden />;
  if (estado === "sem-suporte") return null;

  const Icone = estado === "ligado" ? BellRing : estado === "bloqueado" ? BellOff : Bell;

  return (
    <section aria-labelledby="titulo-avisos" className="rounded-sm border border-borda px-3 py-3">
      <div className="flex items-center gap-2">
        <Icone className={`size-[18px] shrink-0 ${estado === "ligado" ? "text-ouro" : "text-texto-sec"}`} aria-hidden />
        <h2 id="titulo-avisos" className="font-medium">
          {estado === "ligado" ? "Avisos ligados" : "Avisos no celular"}
        </h2>
      </div>

      {estado === "sem-chave" && (
        <p className="mt-1.5 text-label text-texto-sec">
          Ainda não configurados: falta a chave <code className="text-texto">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> no servidor.
        </p>
      )}

      {estado === "instalar-iphone" && (
        <p className="mt-1.5 text-label text-texto-sec">
          No iPhone, toque em <Share className="inline size-3.5 align-[-2px]" aria-label="Compartilhar" /> e depois em{" "}
          <span className="text-texto">Adicionar à Tela de Início</span>. Abra o Vai de Corte por lá e ligue os avisos.
        </p>
      )}

      {estado === "bloqueado" && (
        <p className="mt-1.5 text-label text-texto-sec">
          As notificações estão bloqueadas para este site. Libere nas configurações do navegador (cadeado ao lado do endereço)
          e recarregue a página.
        </p>
      )}

      {estado === "desligado" && (
        <>
          <p className="mt-1.5 text-label text-texto-sec">Receba um aviso a cada agendamento novo feito pelo link.</p>
          <Botao variante="contorno" className="mt-3 w-full" onClick={ligar} carregando={ocupado === "ligar"} textoCarregando="Ligando...">
            Ligar avisos
          </Botao>
        </>
      )}

      {estado === "ligado" && (
        <>
          <p className="mt-1.5 text-label text-texto-sec">Este aparelho avisa cada agendamento novo pelo link.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Botao variante="secundario" onClick={testar} carregando={ocupado === "testar"} disabled={ocupado !== null}>
              Testar
            </Botao>
            <Botao variante="fantasma" onClick={desligar} carregando={ocupado === "desligar"} disabled={ocupado !== null}>
              Desligar
            </Botao>
          </div>
        </>
      )}

      {mensagem && (
        <p role={mensagem.tipo === "erro" ? "alert" : "status"} className={`mt-2 text-label ${mensagem.tipo === "erro" ? "text-erro" : "text-texto-sec"}`}>
          {mensagem.texto}
        </p>
      )}
    </section>
  );
}
