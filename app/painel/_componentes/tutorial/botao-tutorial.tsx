"use client";

import { CircleHelp } from "lucide-react";
import { abrirTutorial } from "./eventos";

/** "Ver tutorial" no menu: abre de novo o passo a passo do painel. */
export function BotaoTutorial() {
  return (
    <button
      type="button"
      onClick={abrirTutorial}
      data-tutorial="ver-tutorial"
      className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-base text-texto-sec transition-colors hover:bg-elevado hover:text-texto"
    >
      <CircleHelp className="size-[18px] shrink-0" aria-hidden />
      Ver tutorial
    </button>
  );
}
