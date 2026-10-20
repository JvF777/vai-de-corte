import type { Metadata } from "next";
import Link from "next/link";
import { Scissors } from "lucide-react";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
          <Scissors className="size-5" />
          Barbeiro SaaS
        </Link>
        <h1 className="text-xl font-bold">Entrar no painel</h1>
        <p className="mb-6 mt-1 text-sm text-zinc-600">
          Acesso para donos e barbeiros. Clientes agendam pelo link da barbearia, sem login.
        </p>
        <FormularioLogin />
        <p className="mt-6 text-xs text-zinc-500">
          Não tem acesso? Peça para o dono da barbearia ou para o suporte criar seu usuário.
        </p>
      </div>
    </main>
  );
}
