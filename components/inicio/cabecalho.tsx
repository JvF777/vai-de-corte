"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, Menu, X } from "lucide-react";
import { Marca } from "@/components/marca";
import { classesBotao } from "@/components/ui/botao";
import { LINKS, MENU } from "./conteudo";

/**
 * Menu do topo. Fica preso no alto da tela e ganha fundo escuro depois que a pessoa rola.
 * No celular, os links vão para um menu que abre por cima.
 */
export function Cabecalho() {
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  // Fecha o menu com Esc.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const fundo = rolou || aberto;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${
        fundo ? "border-ouro-discreto/40 bg-fundo/95" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:h-20 sm:px-8">
        <Link href="/" aria-label="Vai de Corte, página inicial" className="inline-flex min-w-0">
          <Marca />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
          {MENU.map((m) => (
            <a key={m.href} href={m.href} className={classesBotao("fantasma", "md", "max-lg:hidden")}>
              {m.rotulo}
            </a>
          ))}
          <Link href={LINKS.entrar} className={classesBotao("fantasma", "md", "max-[359px]:px-2")}>
            <LogIn aria-hidden />
            Entrar
          </Link>
          <Link href={LINKS.cadastro} className={classesBotao("primario", "md", "font-semibold max-sm:hidden")}>
            Criar barbearia grátis
          </Link>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-controls="menu-celular"
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            className={classesBotao("fantasma", "md", "px-2.5 lg:hidden")}
          >
            {aberto ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </nav>
      </div>

      {aberto && (
        <div id="menu-celular" className="border-t border-borda bg-fundo lg:hidden">
          <ul className="mx-auto flex w-full max-w-[1280px] flex-col px-4 py-3 sm:px-8">
            {MENU.map((m) => (
              <li key={m.href}>
                <a
                  href={m.href}
                  onClick={() => setAberto(false)}
                  className="flex min-h-12 items-center border-b border-borda text-subtitulo text-texto"
                >
                  {m.rotulo}
                </a>
              </li>
            ))}
            <li className="pt-4 pb-2">
              <Link href={LINKS.cadastro} className={classesBotao("primario", "lg", "w-full font-semibold")}>
                Criar minha barbearia grátis
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
