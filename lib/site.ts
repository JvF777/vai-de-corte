/**
 * Endereço público do site, usado no SEO (links do Google, prévia no WhatsApp e redes).
 * Na Vercel, defina NEXT_PUBLIC_SITE_URL (ex.: https://vaidecorte.vercel.app).
 * Sem ela, usa o endereço que a Vercel dá ao deploy, ou localhost no seu computador.
 */
export function urlDoSite() {
  const definido = process.env.NEXT_PUBLIC_SITE_URL;
  if (definido) return definido.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
