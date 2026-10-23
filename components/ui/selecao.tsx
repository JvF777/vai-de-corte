import { useId, type ComponentProps } from "react";
import { ChevronDown } from "lucide-react";

type Props = ComponentProps<"select"> & {
  rotulo: string;
  erro?: string | null;
  dica?: string;
};

/** Lista de opções com o mesmo visual do Campo. */
export function Selecao({ rotulo, erro, dica, id, className = "", children, ...props }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idDica = dica ? `${idCampo}-dica` : undefined;
  const idErro = erro ? `${idCampo}-erro` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-label font-medium text-texto-sec">
        {rotulo}
      </label>
      <div className="relative">
        <select
          id={idCampo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={[idDica, idErro].filter(Boolean).join(" ") || undefined}
          className={`min-h-11 w-full appearance-none rounded-sm border border-borda-campo bg-superficie py-2 pl-3 pr-10 text-base text-texto transition-colors hover:border-texto-disc focus-visible:border-ouro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro/40 disabled:opacity-60 aria-invalid:border-erro ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-texto-sec" aria-hidden />
      </div>
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
