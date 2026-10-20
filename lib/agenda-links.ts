/**
 * Links para o cliente guardar o horário na agenda do celular,
 * sem integração paga: link de criação de evento do Google e arquivo .ics.
 */

export type EventoAgenda = {
  id: string;
  titulo: string;
  descricao: string;
  local: string;
  inicio: string | Date;
  fim: string | Date;
};

/** 2026-10-24T13:00:00.000Z -> 20261024T130000Z */
function carimboUtc(instante: string | Date) {
  return new Date(instante).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function linkGoogleAgenda(e: EventoAgenda) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.titulo,
    dates: `${carimboUtc(e.inicio)}/${carimboUtc(e.fim)}`,
    details: e.descricao,
    location: e.local,
    ctz: "America/Sao_Paulo",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Escapa texto conforme a RFC 5545 (vírgula, ponto e vírgula, barra e quebra de linha). */
function textoIcs(texto: string) {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Linhas do .ics têm no máximo 75 bytes; as seguintes começam com espaço. */
function dobrar(linha: string) {
  const partes: string[] = [];
  let atual = "";
  for (const c of linha) {
    if (new TextEncoder().encode(atual + c).length > 74) {
      partes.push(atual);
      atual = " " + c;
    } else atual += c;
  }
  partes.push(atual);
  return partes.join("\r\n");
}

export function arquivoIcs(e: EventoAgenda) {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vai de Corte//Agendamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@vaidecorte`,
    `DTSTAMP:${carimboUtc(new Date())}`,
    `DTSTART:${carimboUtc(e.inicio)}`,
    `DTEND:${carimboUtc(e.fim)}`,
    `SUMMARY:${textoIcs(e.titulo)}`,
    `DESCRIPTION:${textoIcs(e.descricao)}`,
    `LOCATION:${textoIcs(e.local)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lembrete do seu horário",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}
