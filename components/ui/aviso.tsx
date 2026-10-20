import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

export type TipoAviso = "sucesso" | "erro" | "atencao" | "info";

const estilos: Record<TipoAviso, { classe: string; Icone: typeof Info; rotulo: string }> = {
  sucesso: { classe: "bg-sucesso-fundo text-sucesso border-sucesso/30", Icone: CircleCheck, rotulo: "Sucesso" },
  erro: { classe: "bg-erro-fundo text-erro border-erro/30", Icone: CircleAlert, rotulo: "Erro" },
  atencao: { classe: "bg-atencao-fundo text-atencao border-atencao/30", Icone: TriangleAlert, rotulo: "Atenção" },
  info: { classe: "bg-info-fundo text-info border-info/30", Icone: Info, rotulo: "Informação" },
};

/** Mensagem de feedback: cor, ícone e um rótulo para leitores de tela (não depende só da cor). */
export function Aviso({ tipo, titulo, children, id }: { tipo: TipoAviso; titulo?: string; children: ReactNode; id?: string }) {
  const { classe, Icone, rotulo } = estilos[tipo];
  return (
    <div
      id={id}
      role={tipo === "erro" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-sm border px-4 py-3 text-base ${classe}`}
    >
      <Icone className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <div className="min-w-0">
        <span className="sr-only">{rotulo}: </span>
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className={titulo ? "text-texto-sec" : undefined}>{children}</div>
      </div>
    </div>
  );
}
