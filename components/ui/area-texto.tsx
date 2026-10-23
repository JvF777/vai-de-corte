import { useId, type ComponentProps } from "react";

type Props = ComponentProps<"textarea"> & {
  rotulo: string;
  erro?: string | null;
  dica?: string;
};

/** Texto de várias linhas com o mesmo visual do Campo. */
export function AreaTexto({ rotulo, erro, dica, id, className = "", ...props }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idDica = dica ? `${idCampo}-dica` : undefined;
  const idErro = erro ? `${idCampo}-erro` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-label font-medium text-texto-sec">
        {rotulo}
      </label>
      <textarea
        id={idCampo}
        rows={3}
        aria-invalid={erro ? true : undefined}
        aria-describedby={[idDica, idErro].filter(Boolean).join(" ") || undefined}
        className={`min-h-11 resize-y rounded-sm border border-borda-campo bg-superficie px-3 py-2 text-base text-texto placeholder:text-texto-disc transition-colors hover:border-texto-disc focus-visible:border-ouro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro/40 aria-invalid:border-erro ${className}`}
        {...props}
      />
      {dica && (
        <p id={idDica} className="text-label text-texto-disc">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-label text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
