import { describe, expect, it } from "vitest";
import { instanteLocal, type Funcionamento, type Jornada } from "@/lib/availability";
import { lerPreco } from "@/lib/formatos";
import { acoesPermitidas, faixaDoDia, limitesDoDia, posicaoNaFaixa, resumirDia, resumirDias } from "./agenda";

const SEXTA = "2026-10-23";
const h = (hora: string, data = SEXTA) => {
  const [hh, mm] = hora.split(":").map(Number);
  return instanteLocal(data, hh * 60 + mm);
};

describe("acoesPermitidas", () => {
  const agora = h("10:00");

  it("antes do horário só confirma ou cancela", () => {
    expect(acoesPermitidas("agendado", h("11:00"), agora)).toEqual(["confirmar", "cancelar"]);
    expect(acoesPermitidas("confirmado", h("11:00"), agora)).toEqual(["cancelar"]);
  });

  it("depois que começou dá para concluir ou marcar falta", () => {
    expect(acoesPermitidas("confirmado", h("09:30"), agora)).toEqual(["concluir", "falta", "cancelar"]);
    expect(acoesPermitidas("agendado", h("10:00"), agora)).toContain("concluir");
  });

  it("finalizados só podem ser reabertos", () => {
    for (const s of ["concluido", "falta", "cancelado"] as const) {
      expect(acoesPermitidas(s, h("09:00"), agora)).toEqual(["reabrir"]);
    }
  });
});

describe("faixa e posição na grade", () => {
  const funcionamento: Funcionamento[] = [{ diaSemana: 5, abre: "09:00:00", fecha: "19:00:00" }];
  const jornadas: Jornada[] = [{ diaSemana: 5, inicio: "10:00:00", fim: "19:30:00", almocoInicio: null, almocoFim: null }];

  it("vai do primeiro ao último expediente, em horas cheias", () => {
    expect(faixaDoDia(SEXTA, funcionamento, jornadas, [])).toEqual({ inicio: 540, fim: 1200 });
  });

  it("aumenta para caber um encaixe fora do expediente", () => {
    const faixa = faixaDoDia(SEXTA, funcionamento, [], [{ inicio: h("07:40"), fim: h("08:10") }]);
    expect(faixa).toEqual({ inicio: 420, fim: 1140 });
  });

  it("dia sem expediente usa 9h às 18h", () => {
    expect(faixaDoDia("2026-10-25", funcionamento, jornadas, [])).toEqual({ inicio: 540, fim: 1080 });
  });

  it("posiciona e corta intervalos nas bordas da faixa", () => {
    const faixa = { inicio: 540, fim: 1140 };
    expect(posicaoNaFaixa(SEXTA, faixa, h("10:00"), h("10:30"))).toEqual({ topo: 60, altura: 30 });
    // Folga de vários dias ocupa o dia inteiro visível.
    expect(posicaoNaFaixa(SEXTA, faixa, h("00:00", "2026-10-22"), h("00:00", "2026-10-25"))).toEqual({ topo: 0, altura: 600 });
    expect(posicaoNaFaixa(SEXTA, faixa, h("07:00"), h("08:00"))).toBeNull();
  });

  it("limites do dia seguem o fuso de São Paulo", () => {
    const { de, ate } = limitesDoDia(SEXTA);
    expect(de.toISOString()).toBe("2026-10-23T03:00:00.000Z");
    expect(ate.toISOString()).toBe("2026-10-24T03:00:00.000Z");
  });
});

describe("resumirDia", () => {
  it("conta só os ativos no total e acha o próximo", () => {
    const r = resumirDia(
      [
        { inicio: h("09:00").toISOString(), status: "concluido", precoCentavos: 4000, barbeiroId: "a" },
        { inicio: h("11:00").toISOString(), status: "agendado", precoCentavos: 3000, barbeiroId: "b" },
        { inicio: h("10:30").toISOString(), status: "confirmado", precoCentavos: 6500, barbeiroId: "a" },
        { inicio: h("12:00").toISOString(), status: "cancelado", precoCentavos: 4000, barbeiroId: "a" },
        { inicio: h("09:30").toISOString(), status: "falta", precoCentavos: 4000, barbeiroId: "b" },
      ],
      h("10:00"),
    );
    expect(r).toMatchObject({ total: 3, aConfirmar: 1, concluidos: 1, cancelados: 1, faltas: 1, receitaPrevistaCentavos: 13500 });
    expect(r.proximo).toEqual({ inicio: h("10:30").toISOString(), barbeiroId: "a" });
  });
});

describe("textos", () => {
  it("resume os dias de trabalho", () => {
    expect(resumirDias([2, 3, 4, 5, 6])).toBe("Ter a Sáb");
    expect(resumirDias([1, 3, 5])).toBe("Seg, Qua, Sex");
    expect(resumirDias([6, 0])).toBe("Sáb, Dom");
    expect(resumirDias([])).toBe("Nenhum dia");
  });

  it("lê preços digitados de vários jeitos", () => {
    expect(lerPreco("40")).toBe(4000);
    expect(lerPreco("40,5")).toBe(4050);
    expect(lerPreco("R$ 1.234,90")).toBe(123490);
    expect(lerPreco("12,345")).toBeNull();
    expect(lerPreco("abc")).toBeNull();
  });
});
