import type { ComponentProps, ReactNode } from "react";
import { Check } from "lucide-react";

type Props = Omit<ComponentProps<"input">, "type"> & {
  rotulo: ReactNode;
  dica?: ReactNode;
};

/** Caixa de marcar com área de toque de 44px e o dourado só no visto. */
export function Caixa({ rotulo, dica, className = "", ...props }: Props) {
  return (
    <label className={`group flex min-h-11 cursor-pointer items-start gap-3 py-2.5 ${className}`}>
      <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-[5px] border border-borda-campo bg-superficie transition-colors checked:border-ouro checked:bg-ouro hover:border-texto-disc focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <Check className="pointer-events-none absolute size-3.5 text-sobre-ouro opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-base text-texto">{rotulo}</span>
        {dica && <span className="block text-label text-texto-disc">{dica}</span>}
      </span>
    </label>
  );
}
