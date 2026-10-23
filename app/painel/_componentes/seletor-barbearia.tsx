"use client";

import { useId } from "react";
import { ChevronsUpDown } from "lucide-react";
import type { Vinculo } from "@/lib/auth";
import { trocarBarbearia } from "../actions";

export function SeletorBarbearia({ vinculos, atualId }: { vinculos: Vinculo[]; atualId: string }) {
  const id = useId();
  return (
    <form action={trocarBarbearia} className="flex flex-col gap-1.5">
      <label className="text-label text-texto-disc" htmlFor={id}>
        Barbearia
      </label>
      <div className="relative">
        <select
          id={id}
          name="barbearia_id"
          defaultValue={atualId}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="min-h-11 w-full appearance-none truncate rounded-sm border border-borda-campo bg-elevado py-2 pl-3 pr-9 font-medium text-texto hover:border-texto-disc"
        >
          {vinculos.map((v) => (
            <option key={v.barbeariaId} value={v.barbeariaId}>
              {v.nome}
            </option>
          ))}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-texto-sec" aria-hidden />
      </div>
      <noscript>
        <button type="submit" className="text-label text-ouro-hover underline">
          Trocar
        </button>
      </noscript>
    </form>
  );
}
