import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogOut, Scissors } from "lucide-react";
import { obterContextoPainel } from "@/lib/auth";
import { sair } from "./actions";
import { SeletorBarbearia } from "./seletor-barbearia";

export const metadata: Metadata = { title: { default: "Painel", template: "%s | Painel" } };

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/painel" className="flex items-center gap-2 font-semibold">
            <Scissors className="size-5" />
            <span className="hidden sm:inline">Barbeiro SaaS</span>
          </Link>
          <Suspense fallback={<div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-100" />}>
            <MenuUsuario />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

async function MenuUsuario() {
  const { usuario, vinculos, atual } = await obterContextoPainel();

  return (
    <div className="flex items-center gap-2">
      {atual && vinculos.length > 1 && (
        <SeletorBarbearia vinculos={vinculos} atualId={atual.barbeariaId} />
      )}
      <span className="hidden max-w-48 truncate text-sm text-zinc-600 md:inline">{usuario.email}</span>
      <form action={sair}>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </form>
    </div>
  );
}
