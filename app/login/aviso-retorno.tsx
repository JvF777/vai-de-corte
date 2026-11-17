"use client";

import { useSearchParams } from "next/navigation";
import { Aviso } from "@/components/ui/aviso";

const MENSAGENS: Record<string, string> = {
  google: "Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.",
  "google-cancelado": "O login com o Google foi cancelado.",
  confirmacao: "Não deu para concluir o acesso por esse link (venceu ou foi aberto em outro navegador). Entre de novo.",
};

/** Mostra o motivo quando a pessoa volta para o login depois de um erro (Google ou link de e-mail). */
export function AvisoRetorno() {
  const params = useSearchParams();
  const chave = params.get("erro") ?? (params.get("confirmacao") === "falhou" ? "confirmacao" : null);
  const mensagem = chave ? MENSAGENS[chave] : null;
  if (!mensagem) return null;
  return (
    <div className="mb-5">
      <Aviso tipo={chave === "google-cancelado" ? "atencao" : "erro"}>{mensagem}</Aviso>
    </div>
  );
}
