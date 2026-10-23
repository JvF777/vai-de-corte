import type { z } from "zod";

/** Resposta padrão das Server Actions de formulário do painel. */
export type EstadoFormulario = {
  erro: string | null;
  campos?: Record<string, string>;
  ok?: boolean;
  /** Muda a cada envio, para a tela reagir mesmo se a resposta repetir. */
  tentativa: number;
};

export const estadoInicial: EstadoFormulario = { erro: null, tentativa: 0 };

/** Primeira mensagem de cada campo inválido. */
export function errosDosCampos(erro: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = String(issue.path[0] ?? "");
    if (campo && !campos[campo]) campos[campo] = issue.message;
  }
  return campos;
}

/** Texto amigável que o banco manda em `details` (códigos estáveis em `message`). */
export function textoDoBanco(erro: { details?: string | null }, padrao: string) {
  return erro.details && /^[^\n]{3,200}$/.test(erro.details) ? erro.details : padrao;
}
