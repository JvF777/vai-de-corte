"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck, UserPlus } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { criarConta, type EstadoCadastro } from "./actions";

const estadoInicial: EstadoCadastro = { erro: null, nome: "", email: "" };

export function FormularioCadastro() {
  const [estado, acao, enviando] = useActionState(criarConta, estadoInicial);

  if (estado.confirmar) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex size-12 items-center justify-center rounded-full border border-ouro-discreto text-ouro">
          <MailCheck className="size-6" aria-hidden />
        </div>
        <div>
          <h2 className="font-titulo text-secao font-semibold">Confira o seu e-mail</h2>
          <p className="mt-2 text-texto-sec">
            Mandamos um link para <span className="text-texto">{estado.email}</span>. Toque nele para ativar a conta e
            continuar o cadastro da barbearia. Se não aparecer em alguns minutos, olhe o spam.
          </p>
        </div>
        <Link href="/login" className="self-start text-ouro-hover underline underline-offset-4 hover:text-ouro">
          Já confirmei, quero entrar
        </Link>
      </div>
    );
  }

  const c = estado.campos ?? {};
  return (
    <form action={acao} className="flex flex-col gap-5" noValidate>
      <Campo rotulo="Seu nome" name="nome" autoComplete="name" required defaultValue={estado.nome} erro={c.nome} />
      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={estado.email}
        erro={c.email}
      />
      <Campo
        rotulo="Crie uma senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        dica="Pelo menos 8 caracteres."
        erro={c.senha}
      />
      {/* Armadilha para robôs: fica fora da tela e fora da navegação por teclado. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {estado.erro && (
        <Aviso tipo="erro" id="erro-cadastro">
          {estado.erro}
        </Aviso>
      )}

      <Botao type="submit" tamanho="lg" carregando={enviando} textoCarregando="Criando conta..." icone={<UserPlus aria-hidden />} className="mt-1 w-full">
        Criar conta e continuar
      </Botao>
      <p className="text-label text-texto-disc">
        Usamos o seu e-mail só para o acesso ao painel e avisos do Vai de Corte. Sem cartão de crédito.
      </p>
    </form>
  );
}
