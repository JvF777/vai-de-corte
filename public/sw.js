// Service worker do Vai de Corte: só recebe e mostra os avisos (Web Push).
// Não guarda páginas em cache, então nunca mostra uma agenda velha.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let aviso = { titulo: "Vai de Corte", corpo: "Você tem uma novidade na agenda.", url: "/painel/agenda", tag: "vai-de-corte" };
  try {
    if (event.data) aviso = { ...aviso, ...event.data.json() };
  } catch {
    // Mensagem fora do formato: mostra o texto padrão.
  }

  event.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.corpo,
      tag: aviso.tag,
      icon: "/icones/icone-192.png",
      badge: "/icones/badge-96.png",
      data: { url: aviso.url },
      vibrate: [80, 40, 80],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "/painel/agenda", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reaproveita uma janela do painel que já esteja aberta.
      const painel = abertas.find((c) => new URL(c.url).pathname.startsWith("/painel"));
      if (painel) {
        try {
          await painel.focus();
          return await painel.navigate(destino);
        } catch {
          // Janela que o service worker não controla: abre uma nova.
        }
      }
      return self.clients.openWindow(destino);
    })(),
  );
});
