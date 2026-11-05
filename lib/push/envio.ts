import "server-only";
import webpush, { WebPushError } from "web-push";
import type { Aviso } from "./mensagem";

export type Inscricao = { endpoint: string; p256dh: string; auth: string };

/** Chaves VAPID do .env. Nulo se ainda não foram configuradas (os avisos ficam desligados). */
function chaves() {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const contato = process.env.VAPID_SUBJECT || "mailto:contato@vaidecorte.app";
  if (!publica || !privada) return null;
  return { publica, privada, contato };
}

export function pushConfigurado() {
  return chaves() !== null;
}

/**
 * Manda o aviso para cada aparelho. Devolve os aparelhos que não existem mais
 * (o app foi desinstalado ou as notificações bloqueadas), para apagar do banco.
 */
export async function enviarAviso(inscricoes: Inscricao[], aviso: Aviso) {
  const c = chaves();
  if (!c) {
    console.warn("Web Push: faltam NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY, aviso não enviado.");
    return { enviados: 0, expirados: [] as string[] };
  }

  const corpo = JSON.stringify(aviso);
  const expirados: string[] = [];
  let enviados = 0;

  await Promise.all(
    inscricoes.map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, corpo, {
          vapidDetails: { subject: c.contato, publicKey: c.publica, privateKey: c.privada },
          // Se o celular estiver desligado, o serviço guarda o aviso por até 1 dia.
          TTL: 60 * 60 * 24,
          urgency: "high",
          timeout: 8000,
        });
        enviados++;
      } catch (e) {
        if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) {
          expirados.push(i.endpoint);
        } else {
          console.error("Web Push: falha ao enviar", e instanceof WebPushError ? `${e.statusCode} ${e.body}` : e);
        }
      }
    }),
  );

  return { enviados, expirados };
}
