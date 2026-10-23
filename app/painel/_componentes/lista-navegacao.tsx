"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Papel } from "@/lib/auth";
import { NAVEGACAO } from "./navegacao";

/** papel nulo (ainda carregando) mostra tudo, para a lista não pular. */
export function ListaNavegacao({ papel = null }: { papel?: Papel | null }) {
  const caminho = usePathname();

  return (
    <nav aria-label="Painel">
      <ul className="flex flex-col gap-0.5">
        {NAVEGACAO.filter((item) => !(item.soDono && papel === "barbeiro")).map(({ rotulo, href, Icone, emBreve }) => {
          const ativo = href === "/painel" ? caminho === href : caminho.startsWith(href);
          const classes = "flex min-h-11 items-center gap-3 rounded-sm px-3 text-base";
          if (emBreve) {
            return (
              <li key={href}>
                <span aria-disabled="true" className={`${classes} cursor-default text-texto-disc`}>
                  <Icone className="size-[18px] shrink-0" aria-hidden />
                  <span className="flex-1">{rotulo}</span>
                  <span className="text-[0.75rem] text-texto-disc">Em breve</span>
                </span>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={`${classes} transition-colors ${
                  ativo ? "bg-elevado font-medium text-texto" : "text-texto-sec hover:bg-elevado hover:text-texto"
                }`}
              >
                <Icone className={`size-[18px] shrink-0 ${ativo ? "text-ouro" : ""}`} aria-hidden />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
