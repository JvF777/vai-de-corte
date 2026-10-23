import { FUSO } from "@/lib/availability/tempo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 4000 -> "R$ 40,00" */
export function formatarPreco(centavos: number) {
  return moeda.format(centavos / 100);
}

/** 30 -> "30 min", 60 -> "1 h", 90 -> "1 h 30 min" */
export function formatarDuracao(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const dataLonga = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" });
const horaCurta = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

/** "sábado, 24 de outubro" */
export function formatarDataLonga(instante: Date | string) {
  return dataLonga.format(new Date(instante));
}

/** "09:30" */
export function formatarHora(instante: Date | string) {
  return horaCurta.format(new Date(instante));
}

/** Data "YYYY-MM-DD" (sem hora) em partes para o seletor de dias. */
export function partesDoDia(data: string) {
  const meioDia = new Date(`${data}T12:00:00-03:00`);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, ...o }).format(meioDia);
  return {
    semana: fmt({ weekday: "short" }).replace(".", ""),
    semanaLonga: fmt({ weekday: "long" }),
    dia: fmt({ day: "numeric" }),
    mes: fmt({ month: "short" }).replace(".", ""),
    completa: fmt({ weekday: "long", day: "numeric", month: "long" }),
  };
}

/** "5511900000000" -> "(11) 90000-0000" */
export function formatarWhatsapp(numero: string) {
  const d = numero.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return numero;
}

/** Link wa.me com mensagem pronta (o WhatsApp abre e a pessoa só toca em enviar). */
export function linkWhatsapp(numero: string, mensagem?: string) {
  const base = `https://wa.me/${numero.replace(/\D/g, "")}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
