"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";
import { Botao } from "@/components/ui/botao";

const semAssinatura = () => () => {};

/** Mostra o link público da barbearia e copia para a área de transferência. */
export function CopiarLink({ slug }: { slug: string }) {
  const origem = useSyncExternalStore(semAssinatura, () => window.location.origin, () => "");
  const caminho = `/barbearia/${slug}`;
  const [estado, setEstado] = useState<"parado" | "copiado" | "falhou">("parado");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${origem}${caminho}`);
      setEstado("copiado");
      setTimeout(() => setEstado("parado"), 2500);
    } catch {
      setEstado("falhou");
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 truncate rounded-sm border border-borda bg-superficie px-3 py-2.5 text-base text-texto-sec">
        {origem && <span className="text-texto-disc">{origem}</span>}
        <span className="text-texto">{caminho}</span>
      </p>
      <Botao variante="contorno" onClick={copiar} icone={estado === "copiado" ? <Check aria-hidden /> : <Copy aria-hidden />}>
        {estado === "copiado" ? "Link copiado" : "Copiar link"}
      </Botao>
      <span className="sr-only" aria-live="polite">
        {estado === "copiado" ? "Link copiado para a área de transferência." : ""}
      </span>
      {estado === "falhou" && (
        <p className="text-label text-erro sm:basis-full" role="alert">
          Não foi possível copiar. Selecione o link e copie manualmente.
        </p>
      )}
    </div>
  );
}
