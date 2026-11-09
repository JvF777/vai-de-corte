import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Cliente Supabase com a chave SECRETA (sb_secret_... ou a service_role antiga).
 * Ignora o RLS, então só serve para as poucas tarefas do servidor que nenhum
 * usuário pode fazer, como ler os aparelhos que recebem o aviso de agendamento.
 *
 * - Nunca importe isto em componente "use client" (o "server-only" quebra o build).
 * - A variável NÃO pode ter o prefixo NEXT_PUBLIC_.
 *
 * Devolve nulo se a chave não foi configurada: quem chama deve seguir sem ela.
 */
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) return null;
  const { url } = supabaseEnv();
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
