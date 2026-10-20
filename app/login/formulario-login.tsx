"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { entrar, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = { erro: null, email: "" };

export function FormularioLogin() {
  const [estado, acao, enviando] = useActionState(entrar, estadoInicial);

  return (
    <form action={acao} className="flex flex-col gap-5">
      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={estado.email}
        aria-describedby={estado.erro ? "erro-login" : undefined}
      />
      <Campo
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        required
        minLength={6}
        aria-describedby={estado.erro ? "erro-login" : undefined}
      />

      {estado.erro && (
        <Aviso tipo="erro" id="erro-login">
          {estado.erro}
        </Aviso>
      )}

      <Botao type="submit" tamanho="lg" carregando={enviando} textoCarregando="Entrando..." icone={<LogIn aria-hidden />} className="mt-1 w-full">
        Entrar
      </Botao>
    </form>
  );
}
