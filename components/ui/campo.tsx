import { useId, type ComponentProps } from "react";

type Props = ComponentProps<"input"> & {
  rotulo: string;
  erro?: string | null;
  dica?: string;
};

/** Campo de texto com label associado e erro ligado ao input por aria-describedby. */
export function Campo({ rotulo, erro, dica, id, className = "", "aria-describedby": descritoPor, ...props }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idDica = dica ? `${idCampo}-dica` : undefined;
  const idErro = erro ? `${idCampo}-erro` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-label font-medium text-texto-sec">
        {rotulo}
      </label>
      <input
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={[idDica, idErro, descritoPor].filter(Boolean).join(" ") || undefined}
        className={`min-h-11 rounded-sm border border-borda-campo bg-superficie px-3 text-base text-texto placeholder:text-texto-disc transition-colors hover:border-texto-disc focus-visible:border-ouro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro/40 aria-invalid:border-erro ${className}`}
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
