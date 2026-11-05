import { describe, expect, it } from "vitest";
import { gerarSlug, lerListas, passoDoCampo, schemaDadosBarbearia } from "./index";

function form(pares: [string, string][]) {
  const f = new FormData();
  for (const [k, v] of pares) f.append(k, v);
  return f;
}

describe("gerarSlug", () => {
  it("tira acentos, símbolos e espaços", () => {
    expect(gerarSlug("Barbearia do Zé & Filhos")).toBe("barbearia-do-ze-filhos");
    expect(gerarSlug("  Corte Fino!!  ")).toBe("corte-fino");
    expect(gerarSlug("São João 2")).toBe("sao-joao-2");
  });

  it("limita a 60 caracteres sem terminar em hífen", () => {
    const slug = gerarSlug(`${"a".repeat(59)} b`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("schemaDadosBarbearia", () => {
  const base = { nome: "Navalha", slug: "navalha", whatsapp: "(11) 98888-7777", endereco: "", cidade: "", uf: "sp" };

  it("normaliza WhatsApp e UF", () => {
    const r = schemaDadosBarbearia.parse(base);
    expect(r.whatsapp).toBe("5511988887777");
    expect(r.uf).toBe("SP");
  });

  it("recusa link com espaço ou acento", () => {
    expect(schemaDadosBarbearia.safeParse({ ...base, slug: "com espaço" }).success).toBe(false);
    expect(schemaDadosBarbearia.safeParse({ ...base, slug: "ab" }).success).toBe(false);
  });

  it("recusa WhatsApp sem DDD", () => {
    expect(schemaDadosBarbearia.safeParse({ ...base, whatsapp: "98888-7777" }).success).toBe(false);
  });
});

describe("lerListas", () => {
  it("lê serviços e barbeiros, ignorando linhas vazias", () => {
    const r = lerListas(
      form([
        ["servico_nome", "Corte"],
        ["servico_preco", "40"],
        ["servico_duracao", "30"],
        ["servico_nome", ""],
        ["servico_preco", ""],
        ["servico_duracao", "30"],
        ["barbeiro_nome", "João"],
        ["barbeiro_nome", "Carlos"],
        ["sou_eu", "0"],
      ]),
    );
    expect(r.campos).toEqual({});
    expect(r.servicos).toEqual([{ nome: "Corte", preco_centavos: 4000, duracao_minutos: 30 }]);
    expect(r.barbeiros).toEqual([
      { nome: "João", sou_eu: true },
      { nome: "Carlos", sou_eu: false },
    ]);
  });

  it("aponta o campo com erro pela linha", () => {
    const r = lerListas(
      form([
        ["servico_nome", "Corte"],
        ["servico_preco", "quarenta"],
        ["servico_duracao", "30"],
        ["barbeiro_nome", "J"],
      ]),
    );
    expect(r.campos.servico_preco_0).toBeDefined();
    expect(r.campos.barbeiro_nome_0).toBeDefined();
  });

  it("exige pelo menos um serviço e um barbeiro", () => {
    const r = lerListas(form([]));
    expect(r.campos.servicos).toBeDefined();
    expect(r.campos.barbeiros).toBeDefined();
  });
});

describe("passoDoCampo", () => {
  it("leva cada erro ao passo certo", () => {
    expect(passoDoCampo("slug")).toBe(0);
    expect(passoDoCampo("fim_3")).toBe(1);
    expect(passoDoCampo("servico_preco_0")).toBe(2);
    expect(passoDoCampo("barbeiros")).toBe(3);
  });
});
