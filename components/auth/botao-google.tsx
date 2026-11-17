"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { entrarComGoogle } from "@/app/auth/actions";

type Props = {
  /** Para onde ir depois do Google: o painel (login) ou o cadastro da barbearia (conta nova). */
  proximo: "/painel" | "/painel/nova-barbearia";
};

/** Botão "Continuar com Google", no padrão escuro que o Google pede para o botão de login. */
export function BotaoGoogle({ proximo }: Props) {
  return (
    <form action={entrarComGoogle}>
      <input type="hidden" name="proximo" value={proximo} />
      <Conteudo />
    </form>
  );
}

function Conteudo() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-sm border border-borda-forte bg-[#131314] px-5 text-[1rem] font-medium text-texto transition-colors duration-150 hover:border-ouro-discreto hover:bg-elevado disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <LoaderCircle className="size-[18px] shrink-0 animate-spin" aria-hidden /> : <LogoGoogle />}
      {pending ? "Abrindo o Google..." : "Continuar com Google"}
    </button>
  );
}

/** "G" oficial do Google (as cores são exigência da marca do Google). */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Linha "ou com e-mail" entre o Google e o formulário. */
export function DivisorOu({ texto = "ou com e-mail" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 text-label text-texto-disc" role="separator" aria-label={texto}>
      <span className="h-px flex-1 bg-borda" />
      <span aria-hidden>{texto}</span>
      <span className="h-px flex-1 bg-borda" />
    </div>
  );
}
