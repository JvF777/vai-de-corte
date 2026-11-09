import { describe, expect, it } from "vitest";
import { instanteLocal } from "@/lib/availability";
import { diasDoPeriodo, escalaDoGrafico, lerPeriodo, limitesDoPeriodo, resumirGanhos, somarMeses, type AgendamentoGanho } from "./ganhos";

const SEXTA = "2026-10-23";
const h = (hora: string, data = SEXTA) => {
  const [hh, mm] = hora.split(":").map(Number);
  return instanteLocal(data, hh * 60 + mm).toISOString();
};

const corte = { id: "corte", nome: "Corte" };
const barba = { id: "barba", nome: "Barba" };
let n = 0;
const ag = (parcial: Partial<AgendamentoGanho>): AgendamentoGanho => ({
  id: `a${++n}`,
  barbeiroId: "b1",
  inicio: h("09:00"),
  status: "concluido",
  precoCentavos: 4000,
  servico: corte,
  ...parcial,
});

describe("resumirGanhos", () => {
  const agora = new Date(h("14:00"));

  it("soma só o que foi concluído e calcula o ticket médio", () => {
    const g = resumirGanhos(
      [
        ag({ precoCentavos: 4000 }),
        ag({ precoCentavos: 3000, servico: barba, inicio: h("10:00") }),
        ag({ precoCentavos: 6500, inicio: h("11:00") }),
        ag({ status: "cancelado", precoCentavos: 9900 }),
      ],
      agora,
    );
    expect(g.faturadoCentavos).toBe(13500);
    expect(g.atendidos).toBe(3);
    expect(g.ticketMedioCentavos).toBe(4500);
    expect(g.cancelados).toBe(1);
    expect(g.porDia).toEqual({ [SEXTA]: 13500 });
  });

  it("separa o que ainda vai acontecer do que passou e ninguém marcou", () => {
    const g = resumirGanhos(
      [
        ag({ status: "confirmado", inicio: h("16:00"), precoCentavos: 4000 }),
        ag({ status: "agendado", inicio: h("17:00"), precoCentavos: 3000 }),
        ag({ status: "agendado", inicio: h("13:00"), precoCentavos: 5000 }),
      ],
      agora,
    );
    expect(g).toMatchObject({ naAgenda: 2, naAgendaCentavos: 7000, semMarcar: 1, semMarcarCentavos: 5000, faturadoCentavos: 0 });
    expect(g.ticketMedioCentavos).toBeNull();
  });

  it("conta faltas e o valor que deixou de entrar", () => {
    const g = resumirGanhos([ag({ status: "falta", precoCentavos: 4000 }), ag({ status: "falta", precoCentavos: 2500 })], agora);
    expect(g).toMatchObject({ faltas: 2, faltasCentavos: 6500, atendidos: 0, faturadoCentavos: 0 });
  });

  it("ordena serviços pelos mais feitos e barbeiros pelo faturado", () => {
    const g = resumirGanhos(
      [
        ag({ servico: barba, precoCentavos: 3000 }),
        ag({ servico: barba, precoCentavos: 3000, barbeiroId: "b2" }),
        ag({ servico: corte, precoCentavos: 4000, barbeiroId: "b2" }),
        ag({ status: "falta", barbeiroId: "b1" }),
        ag({ status: "agendado", inicio: h("18:00"), barbeiroId: "b3" }),
      ],
      agora,
    );
    expect(g.porServico.map((s) => [s.nome, s.quantidade, s.faturadoCentavos])).toEqual([
      ["Barba", 2, 6000],
      ["Corte", 1, 4000],
    ]);
    expect(g.porBarbeiro).toEqual([
      { barbeiroId: "b2", atendidos: 2, faturadoCentavos: 7000, faltas: 0, naAgenda: 0 },
      { barbeiroId: "b1", atendidos: 1, faturadoCentavos: 3000, faltas: 1, naAgenda: 0 },
      { barbeiroId: "b3", atendidos: 0, faturadoCentavos: 0, faltas: 0, naAgenda: 1 },
    ]);
  });

  it("agrupa o faturado pelo dia local, mesmo perto da meia-noite", () => {
    const g = resumirGanhos([ag({ inicio: h("23:30", "2026-10-22") }), ag({ inicio: h("00:30") })], agora);
    expect(g.porDia).toEqual({ "2026-10-22": 4000, [SEXTA]: 4000 });
  });
});

describe("períodos", () => {
  it("o mês vai do dia 1 até o último dia", () => {
    expect(diasDoPeriodo("mes", SEXTA)).toHaveLength(31);
    expect(diasDoPeriodo("mes", "2026-02-10").at(-1)).toBe("2026-02-28");
    expect(diasDoPeriodo("dia", SEXTA)).toEqual([SEXTA]);
  });

  it("troca de ano ao somar meses", () => {
    expect(somarMeses("2026-12-15", 1)).toBe("2027-01-01");
    expect(somarMeses("2026-01-15", -1)).toBe("2025-12-01");
  });

  it("limites no fuso de São Paulo", () => {
    expect(limitesDoPeriodo("dia", SEXTA)).toEqual({ de: new Date("2026-10-23T03:00:00Z"), ate: new Date("2026-10-24T03:00:00Z") });
    expect(limitesDoPeriodo("mes", SEXTA)).toEqual({ de: new Date("2026-10-01T03:00:00Z"), ate: new Date("2026-11-01T03:00:00Z") });
  });

  it("lê a URL com segurança", () => {
    expect(lerPeriodo(undefined, undefined, SEXTA)).toEqual({ periodo: "dia", data: SEXTA });
    expect(lerPeriodo("mes", "2026-09-17", SEXTA)).toEqual({ periodo: "mes", data: "2026-09-01" });
    expect(lerPeriodo("ano", "2026-02-31", SEXTA)).toEqual({ periodo: "dia", data: SEXTA });
  });
});

describe("escalaDoGrafico", () => {
  it("topo redondo e sempre acima do maior dia", () => {
    expect(escalaDoGrafico(0)).toEqual({ topo: 4000, marcas: [0, 1000, 2000, 3000, 4000] });
    expect(escalaDoGrafico(38000).topo).toBe(40000);
    expect(escalaDoGrafico(40000).topo).toBe(100000);
  });
});
