"use client";

import { useActionState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { entrar, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = { erro: null, email: "" };

export function FormularioLogin() {
  const [estado, acao, enviando] = useActionState(entrar, estadoInicial);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.email}
          className="rounded-lg border border-zinc-300 px-3 py-2.5 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Senha
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          className="rounded-lg border border-zinc-300 px-3 py-2.5 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        />
      </label>

      {estado.erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-60"
      >
        {enviando ? <LoaderCircle className="size-5 animate-spin" /> : <LogIn className="size-5" />}
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
