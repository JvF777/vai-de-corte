import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseEnv } from "./env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a sessão do usuário (cookies), então o RLS do banco vale normalmente.
 * Crie um novo cliente a cada requisição.
 */
export async function criarClienteServidor() {
  // O cliente usa o relógio (validade do token) e a rede, então só roda na hora
  // da requisição, nunca em prerender ou prefetch.
  await connection();
  const { url, chave } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          cookiesParaGravar.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components não podem gravar cookies. Tudo bem: o proxy.ts
          // renova a sessão antes de a página renderizar.
        }
      },
    },
  });
}
