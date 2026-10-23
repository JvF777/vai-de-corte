import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Imagens da vitrine no Supabase Storage (bucket público "barbearias").
 * Caminho: <barbearia_id>/<prefixo>-<uuid>.<ext>. O RLS do Storage só deixa o
 * dono gravar na pasta da própria barbearia.
 */

const BUCKET = "barbearias";
const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const TAMANHO_MAXIMO = 3 * 1024 * 1024;

export async function enviarImagem(
  supabase: SupabaseClient,
  barbeariaId: string,
  arquivo: unknown,
  prefixo: "logo" | "foto" | "barbeiro",
): Promise<{ url: string; erro: null } | { url: null; erro: string }> {
  if (!(arquivo instanceof File) || arquivo.size === 0) return { url: null, erro: "Escolha uma imagem." };
  const ext = TIPOS[arquivo.type];
  if (!ext) return { url: null, erro: "Use uma imagem JPG, PNG ou WebP." };
  if (arquivo.size > TAMANHO_MAXIMO) return { url: null, erro: "A imagem passou de 3 MB. Escolha uma menor." };

  const caminho = `${barbeariaId}/${prefixo}-${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: arquivo.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("enviarImagem", error);
    return { url: null, erro: "Não foi possível enviar a imagem. Tente de novo." };
  }
  return { url: supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl, erro: null };
}

/** Apaga do Storage uma imagem que este app enviou (URLs de fora são ignoradas). */
export async function apagarImagem(supabase: SupabaseClient, barbeariaId: string, url: string | null) {
  if (!url) return;
  const marcador = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marcador);
  if (i < 0) return;
  const caminho = decodeURIComponent(url.slice(i + marcador.length));
  if (!caminho.startsWith(`${barbeariaId}/`)) return;
  const { error } = await supabase.storage.from(BUCKET).remove([caminho]);
  if (error) console.error("apagarImagem", error);
}
