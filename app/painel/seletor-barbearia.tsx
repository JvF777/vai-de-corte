"use client";

import type { Vinculo } from "@/lib/auth";
import { trocarBarbearia } from "./actions";

export function SeletorBarbearia({ vinculos, atualId }: { vinculos: Vinculo[]; atualId: string }) {
  return (
    <form action={trocarBarbearia}>
      <label className="sr-only" htmlFor="barbearia_id">
        Barbearia
      </label>
      <select
        id="barbearia_id"
        name="barbearia_id"
        defaultValue={atualId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="max-w-48 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
      >
        {vinculos.map((v) => (
          <option key={v.barbeariaId} value={v.barbeariaId}>
            {v.nome}
          </option>
        ))}
      </select>
    </form>
  );
}
