"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { classesBotao } from "@/components/ui/botao";
import { LINKS, linkWhatsApp } from "./conteudo";

/**
 * Botões que acompanham a rolagem:
 * - WhatsApp do time, no canto (só aparece se o número estiver em conteudo.ts; no celular, depois do topo);
 * - no celular, uma barra de cadastro embaixo, que surge depois do topo e some na chamada final.
 */
export function BotoesFixos() {
  const whatsapp = linkWhatsApp();
  const [mostrarBarra, setMostrarBarra] = useState(false);
  const [passouTopo, setPassouTopo] = useState(false);

  useEffect(() => {
    const topo = document.getElementById("topo");
    if (!topo) return;
    // Some na chamada final e no rodapé, onde o botão de cadastro já está na tela.
    const fim = ["comecar", "rodape"].map((id) => document.getElementById(id)).filter((el) => el !== null);
    let passou = false;
    const noFim = new Set<Element>();
    const observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.target === topo) passou = !e.isIntersecting;
        else if (e.isIntersecting) noFim.add(e.target);
        else noFim.delete(e.target);
      }
      setPassouTopo(passou);
      setMostrarBarra(passou && noFim.size === 0);
    });
    observador.observe(topo);
    fim.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, []);

  return (
    <>
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com o Vai de Corte no WhatsApp"
          className={`fixed right-4 z-40 inline-flex size-14 items-center justify-center rounded-full border border-ouro-discreto bg-card text-ouro shadow-flutuante transition-[transform,background-color,bottom] duration-300 hover:-translate-y-0.5 hover:bg-elevado sm:right-6 sm:bottom-6 ${
            mostrarBarra ? "bottom-[5.5rem]" : "bottom-4"
          } ${passouTopo ? "" : "max-sm:hidden"}`}
        >
          <MessageCircle aria-hidden className="size-6" strokeWidth={1.8} />
        </a>
      )}

      <div
        inert={!mostrarBarra}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-fundo/95 px-4 py-3 transition-transform duration-300 sm:hidden ${
          mostrarBarra ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <Link
          href={LINKS.cadastro}
          className={classesBotao("primario", "lg", "w-full font-semibold")}
        >
          Criar minha barbearia grátis
          <ArrowRight aria-hidden />
        </Link>
      </div>
    </>
  );
}
