"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { estadoInicial, type EstadoFormulario } from "./formulario";

type Acao = (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

/**
 * Liga um formulário a uma Server Action sem o React limpar os campos quando
 * a resposta volta com erro (o envio passa por onSubmit em vez de action=).
 * `aoConcluir` roda uma vez a cada envio que termina com ok; `limpar` esvazia o formulário nessa hora.
 */
export function useFormulario(acao: Acao, aoConcluir?: () => void, { limpar = false } = {}) {
  const [estado, enviar, pendente] = useActionState(acao, estadoInicial);
  const concluir = useRef(aoConcluir);
  const formulario = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    concluir.current = aoConcluir;
  });

  useEffect(() => {
    if (!estado.ok) return;
    if (limpar) formulario.current?.reset();
    concluir.current?.();
  }, [estado, limpar]);

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    formulario.current = e.currentTarget;
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  }

  return { estado, pendente, aoEnviar };
}
