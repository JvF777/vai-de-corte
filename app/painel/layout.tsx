import type { Metadata } from "next";
import Link from "next/link";
import { Marca } from "@/components/marca";
import { ConteudoLateral } from "./_componentes/conteudo-lateral";
import { MenuMobile } from "./_componentes/menu-mobile";

export const metadata: Metadata = { title: { default: "Painel", template: "%s | Painel | Vai de Corte" } };

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const marca = (
    <Link href="/painel" className="rounded-sm" aria-label="Vai de Corte, visão geral">
      <Marca />
    </Link>
  );

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 overflow-y-auto border-r border-borda bg-superficie px-4 py-6 lg:flex">
        <div className="px-1">{marca}</div>
        <ConteudoLateral />
      </aside>

      <MenuMobile marca={marca}>
        <ConteudoLateral />
      </MenuMobile>

      <main className="w-full min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
