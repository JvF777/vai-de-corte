import type { Metadata } from "next";

/**
 * Deixa o painel instalável na tela inicial do celular (vira um "app").
 * Só o painel e o login usam: o link público do cliente não oferece instalação.
 */
export const metadataApp: Pick<Metadata, "manifest" | "appleWebApp"> = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Vai de Corte", statusBarStyle: "black" },
};
