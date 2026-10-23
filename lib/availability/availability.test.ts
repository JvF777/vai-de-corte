import { describe, expect, it } from "vitest";
import {
  calcularHorarios,
  diaDaSemana,
  diasDaJanela,
  instanteLocal,
  paraLocal,
  type BarbeiroAgenda,
  type EntradaHorarios,
} from "./index";

// Cenário parecido com a barbearia fictícia do seed.
const CORTE = "corte";
const BARBA = "barba";
const SABADO = "2026-10-24";
const AGORA = new Date("2026-10-20T12:00:00-03:00"); // terça

const carlos: BarbeiroAgenda = {
  id: "carlos",
  servicoIds: [CORTE],
  jornadas: [2, 3, 4, 5, 6].map((d) => ({ diaSemana: d, inicio: "09:00:00", fim: "18:00:00", almocoInicio: "12:00:00", almocoFim: "13:00:00" })),
};
const rafael: BarbeiroAgenda = {
  id: "rafael",
  servicoIds: [CORTE, BARBA],
  jornadas: [3, 4, 5, 6].map((d) => ({ diaSemana: d, inicio: "10:00:00", fim: "19:00:00", almocoInicio: "13:00:00", almocoFim: "14:00:00" })),
};

function entrada(extra: Partial<EntradaHorarios> = {}): EntradaHorarios {
  return {
    data: SABADO,
    servicoId: CORTE,
    duracaoMinutos: 30,
    barbeiroId: "carlos",
    barbeiros: [carlos, rafael],
    funcionamento: [2, 3, 4, 5, 6].map((d) => ({ diaSemana: d, abre: "09:00:00", fecha: "19:00:00" })),
    ocupados: [],
    regras: { intervaloMinutos: 30, antecedenciaMinutos: 60, janelaDias: 30 },
    agora: AGORA,
    ...extra,
  };
}

const horas = (e: EntradaHorarios) => calcularHorarios(e).map((h) => h.hora);
const em = (hora: string, data = SABADO) => new Date(`${data}T${hora}:00-03:00`);

describe("tempo", () => {
  it("converte hora local de São Paulo para instante UTC e volta", () => {
    expect(instanteLocal(SABADO, 9 * 60).toISOString()).toBe("2026-10-24T12:00:00.000Z");
    expect(paraLocal(new Date("2026-10-25T02:30:00Z"))).toEqual({ data: "2026-10-24", minutos: 23 * 60 + 30 });
  });

  it("usa o mesmo dia da semana do Postgres (0 = domingo)", () => {
    expect(diaDaSemana("2026-10-25")).toBe(0);
    expect(diaDaSemana(SABADO)).toBe(6);
  });
});

describe("calcularHorarios", () => {
  it("monta a grade a partir da meia-noite, dentro da jornada e fora do almoço", () => {
    expect(horas(entrada())).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    ]);
  });

  it("considera a duração: serviço de 60 min não pode encostar no almoço nem passar do fim", () => {
    const h = horas(entrada({ duracaoMinutos: 60 }));
    expect(h).toContain("11:00");
    expect(h).not.toContain("11:30");
    expect(h).toContain("17:00");
    expect(h).not.toContain("17:30");
  });

  it("alinha à grade quando a barbearia abre fora dela", () => {
    const h = horas(entrada({ funcionamento: [{ diaSemana: 6, abre: "08:45:00", fecha: "19:00:00" }], barbeiroId: null }));
    expect(h[0]).toBe("09:00");
  });

  it("tira horários que conflitam com agendamentos do mesmo barbeiro", () => {
    const h = horas(entrada({ ocupados: [{ barbeiroId: "carlos", inicio: em("10:00"), fim: em("11:00") }] }));
    expect(h).toContain("09:30");
    expect(h).not.toContain("10:00");
    expect(h).not.toContain("10:30");
    expect(h).toContain("11:00");
  });

  it("serviço longo não começa antes de um agendamento se não couber", () => {
    const h = horas(entrada({ duracaoMinutos: 60, ocupados: [{ barbeiroId: "carlos", inicio: em("10:00"), fim: em("10:30") }] }));
    expect(h).not.toContain("09:30");
    expect(h).toContain("10:30");
  });

  it("o mesmo horário segue livre com outro barbeiro", () => {
    const ocupados = [{ barbeiroId: "carlos", inicio: em("15:00"), fim: em("15:30") }];
    expect(horas(entrada({ ocupados }))).not.toContain("15:00");
    expect(horas(entrada({ ocupados, barbeiroId: "rafael" }))).toContain("15:00");

    const qualquer = calcularHorarios(entrada({ ocupados, barbeiroId: null })).find((h) => h.hora === "15:00");
    expect(qualquer?.barbeiroIds).toEqual(["rafael"]);
  });

  it("respeita bloqueios do barbeiro e da barbearia inteira", () => {
    const doBarbeiro = horas(entrada({ ocupados: [{ barbeiroId: "carlos", inicio: em("09:00"), fim: em("12:00") }] }));
    expect(doBarbeiro[0]).toBe("13:00");

    const daBarbearia = horas(entrada({ barbeiroId: null, ocupados: [{ barbeiroId: null, inicio: em("00:00"), fim: em("23:59") }] }));
    expect(daBarbearia).toEqual([]);
  });

  it("folga fixa: sem jornada no dia não há horário", () => {
    // Terça: Rafael não trabalha.
    expect(horas(entrada({ data: "2026-10-27", barbeiroId: "rafael" }))).toEqual([]);
    // Domingo: a barbearia está fechada.
    expect(horas(entrada({ data: "2026-10-25", barbeiroId: null }))).toEqual([]);
  });

  it("só oferece barbeiros que fazem o serviço", () => {
    expect(horas(entrada({ servicoId: BARBA, barbeiroId: "carlos" }))).toEqual([]);
    const barba = calcularHorarios(entrada({ servicoId: BARBA, barbeiroId: null }));
    expect(barba.every((h) => h.barbeiroIds.join() === "rafael")).toBe(true);
  });

  it("não oferece horário no passado nem dentro da antecedência mínima", () => {
    const agora = em("10:10");
    const h = horas(entrada({ agora }));
    expect(h).not.toContain("11:00");
    expect(h[0]).toBe("11:30");
  });

  it("não oferece horário além da janela de agendamento", () => {
    expect(horas(entrada({ regras: { intervaloMinutos: 30, antecedenciaMinutos: 60, janelaDias: 2 } }))).toEqual([]);
  });

  it("respeita intervalo configurado pela barbearia", () => {
    const h = horas(entrada({ regras: { intervaloMinutos: 20, antecedenciaMinutos: 60, janelaDias: 30 } }));
    expect(h.slice(0, 4)).toEqual(["09:00", "09:20", "09:40", "10:00"]);
  });

  it("não atravessa a meia-noite", () => {
    const tarde = { diaSemana: 6, inicio: "20:00:00", fim: "24:00:00", almocoInicio: null, almocoFim: null };
    const h = horas(
      entrada({
        barbeiros: [{ id: "x", servicoIds: [CORTE], jornadas: [tarde] }],
        barbeiroId: null,
        funcionamento: [{ diaSemana: 6, abre: "20:00:00", fecha: "24:00:00" }],
      }),
    );
    expect(h.at(-1)).toBe("23:00");
  });
});

describe("diasDaJanela", () => {
  it("lista de hoje até o fim da janela, marcando os dias sem atendimento", () => {
    const dias = diasDaJanela({ ...entrada(), barbeiroId: "rafael", regras: { intervaloMinutos: 30, antecedenciaMinutos: 60, janelaDias: 7 } });
    expect(dias.map((d) => d.data)).toEqual([
      "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27",
    ]);
    // Terça e segunda: Rafael folga. Domingo: fechado.
    expect(dias.filter((d) => !d.atende).map((d) => d.data)).toEqual(["2026-10-20", "2026-10-25", "2026-10-26", "2026-10-27"]);
  });

  it("hoje deixa de contar depois que a barbearia fecha", () => {
    const base = { ...entrada(), barbeiroId: null, regras: { intervaloMinutos: 30, antecedenciaMinutos: 60, janelaDias: 2 } };
    expect(diasDaJanela({ ...base, agora: em("10:00", "2026-10-20") })[0]).toEqual({ data: "2026-10-20", atende: true });
    expect(diasDaJanela({ ...base, agora: em("18:30", "2026-10-20") })[0]).toEqual({ data: "2026-10-20", atende: false });
  });
});
