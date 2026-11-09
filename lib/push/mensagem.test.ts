import { describe, expect, it } from "vitest";
import { instanteLocal } from "@/lib/availability";
import { avisoNovoAgendamento, quandoCurto } from "./mensagem";

// Quinta, 5/11/2026, 10:00 em São Paulo.
const agora = instanteLocal("2026-11-05", 10 * 60);

const dados = {
  id: "ag-1",
  barbearia: "Navalha de Ouro",
  barbeiroId: "b-1",
  barbeiro: "Carlos",
  servico: "Corte",
  cliente: "João Silva",
};

describe("quandoCurto", () => {
  it("usa hoje e amanhã no fuso da barbearia", () => {
    expect(quandoCurto(instanteLocal("2026-11-05", 15 * 60), agora)).toBe("hoje");
    expect(quandoCurto(instanteLocal("2026-11-06", 9 * 60), agora)).toBe("amanhã");
  });

  it("mostra dia da semana e data nos outros dias", () => {
    expect(quandoCurto(instanteLocal("2026-11-07", 9 * 60), agora)).toBe("sáb, 7/11");
  });

  it("23:30 em São Paulo continua sendo hoje (já é amanhã em UTC)", () => {
    expect(quandoCurto(instanteLocal("2026-11-05", 23 * 60 + 30), agora)).toBe("hoje");
  });
});

describe("avisoNovoAgendamento", () => {
  it("monta título, texto e o link da agenda do dia do barbeiro", () => {
    const aviso = avisoNovoAgendamento({ ...dados, inicio: instanteLocal("2026-11-06", 15 * 60).toISOString() }, agora);
    expect(aviso).toEqual({
      titulo: "Novo agendamento: João Silva",
      corpo: "Corte com Carlos, amanhã às 15:00\nNavalha de Ouro",
      url: "/painel/agenda?data=2026-11-06&barbeiro=b-1",
      tag: "agendamento-ag-1",
    });
  });
});
