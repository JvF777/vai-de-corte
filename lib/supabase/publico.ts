import "server-only";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { supabaseEnv } from "./env";

/**
 * Cliente Supabase do link público: chave publishable, sem sessão e sem cookies.
 * Mesmo que um barbeiro logado abra o link, as consultas rodam como visitante
 * (anon), então só valem o RLS do catálogo e as RPCs públicas.
 */
export async function criarClientePublico() {
  // Os dados mudam a cada agendamento: sempre na hora da requisição.
  await connection();
  const { url, chave } = supabaseEnv();
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
