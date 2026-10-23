import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // Só o painel e o login precisam de sessão. O link público (/barbearia/...) fica de fora.
  matcher: ["/painel/:path*", "/login"],
};
