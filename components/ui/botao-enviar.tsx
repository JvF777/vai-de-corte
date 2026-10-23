"use client";

import { useFormStatus } from "react-dom";
import { Botao } from "./botao";

type Props = Omit<React.ComponentProps<typeof Botao>, "type" | "carregando">;

/** Botão de formulário que mostra o carregamento enquanto a Server Action roda. */
export function BotaoEnviar(props: Props) {
  const { pending } = useFormStatus();
  return <Botao {...props} type="submit" carregando={pending} />;
}
