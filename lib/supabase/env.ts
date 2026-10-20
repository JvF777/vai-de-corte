import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: "NEXT_PUBLIC_SUPABASE_URL ausente ou inválida" }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente" })
    .min(20, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY parece incompleta"),
});

// As variáveis NEXT_PUBLIC_ precisam ser lidas por extenso para o Next.js embutir no bundle.
export function supabaseEnv() {
  const resultado = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!resultado.success) {
    const problemas = resultado.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Configuração do Supabase incompleta (veja .env.example): ${problemas}`);
  }
  return {
    url: resultado.data.NEXT_PUBLIC_SUPABASE_URL,
    chave: resultado.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
