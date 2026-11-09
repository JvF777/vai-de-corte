"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Trash2, X } from "lucide-react";
import { AreaTexto } from "@/components/ui/area-texto";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Selecao } from "@/components/ui/selecao";
import type { Funcionamento } from "@/lib/availability";
import { formatarWhatsapp } from "@/lib/formatos";
import type { BarbeariaPainel } from "@/lib/painel/dados";
import { useFormulario } from "@/lib/painel/use-formulario";
import { EnviarImagem } from "../../_componentes/enviar-imagem";
import { GradeSemana, type HorarioDia } from "../../_componentes/grade-semana";
import { RodapeSecao, Secao } from "../../_componentes/secao";
import { adicionarFoto, removerFoto, removerLogo, salvarDados, salvarFuncionamento, salvarRegras, trocarLogo } from "../actions";

const ANTECEDENCIAS = [
  { valor: 0, rotulo: "Sem mínimo" },
  { valor: 30, rotulo: "30 minutos antes" },
  { valor: 60, rotulo: "1 hora antes" },
  { valor: 120, rotulo: "2 horas antes" },
  { valor: 240, rotulo: "4 horas antes" },
  { valor: 720, rotulo: "12 horas antes" },
  { valor: 1440, rotulo: "1 dia antes" },
];
const JANELAS = [7, 14, 21, 30, 45, 60, 90];

export function EdicaoBarbearia({ barbearia, funcionamento }: { barbearia: BarbeariaPainel; funcionamento: Funcionamento[] }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-titulo text-[1.625rem] font-bold leading-tight tracking-[-0.02em] sm:text-titulo">Barbearia</h1>
          <p className="mt-1 max-w-xl text-texto-sec">Tudo o que o cliente vê no link de agendamento, mais as regras de quando ele pode marcar.</p>
        </div>
        <Link
          href={`/barbearia/${barbearia.slug}`}
          target="_blank"
          className="inline-flex min-h-11 items-center gap-2 text-ouro-hover underline-offset-4 hover:underline"
        >
          Ver como o cliente vê
          <ExternalLink className="size-4" aria-hidden />
        </Link>
      </header>

      <Dados barbearia={barbearia} />
      <Imagens barbearia={barbearia} />
      <Horario funcionamento={funcionamento} />
      <Regras barbearia={barbearia} />
    </div>
  );
}

function Dados({ barbearia: b }: { barbearia: BarbeariaPainel }) {
  const { estado, pendente, aoEnviar } = useFormulario(salvarDados);
  const erro = (c: string) => estado.campos?.[c] ?? null;
  return (
    <Secao titulo="Dados da barbearia" descricao={`O endereço do link não muda: /barbearia/${b.slug}.`}>
      <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
        <Campo rotulo="Nome" name="nome" defaultValue={b.nome} maxLength={120} erro={erro("nome")} />
        <AreaTexto
          rotulo="Sobre a barbearia (opcional)"
          name="descricao"
          defaultValue={b.descricao ?? ""}
          maxLength={1000}
          placeholder="Ex.: cortes clássicos e barba na toalha quente, desde 2015."
          erro={erro("descricao")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="WhatsApp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            defaultValue={b.whatsapp ? formatarWhatsapp(b.whatsapp) : ""}
            placeholder="(11) 91234-5678"
            dica="É para onde vai o botão de WhatsApp da página."
            erro={erro("whatsapp")}
          />
          <Campo rotulo="Instagram (opcional)" name="instagram" defaultValue={b.instagram ?? ""} placeholder="suabarbearia" erro={erro("instagram")} />
        </div>
        <Campo rotulo="Endereço" name="endereco" defaultValue={b.endereco ?? ""} maxLength={300} placeholder="Rua, número, bairro" erro={erro("endereco")} />
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-4">
          <Campo rotulo="Cidade" name="cidade" defaultValue={b.cidade ?? ""} maxLength={100} erro={erro("cidade")} />
          <Campo rotulo="UF" name="uf" defaultValue={b.uf ?? ""} maxLength={2} className="uppercase" erro={erro("uf")} />
        </div>
        <Campo
          rotulo="Link do Google Maps (opcional)"
          name="mapsUrl"
          type="url"
          defaultValue={b.mapsUrl ?? ""}
          placeholder="https://maps.app.goo.gl/..."
          dica="No Google Maps, abra a barbearia, toque em Compartilhar e cole o link aqui."
          erro={erro("mapsUrl")}
        />
        <RodapeSecao estado={estado} pendente={pendente} />
      </form>
    </Secao>
  );
}

function Imagens({ barbearia: b }: { barbearia: BarbeariaPainel }) {
  const [erro, setErro] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  const remover = (chave: string, acao: () => Promise<{ erro: string | null }>) => {
    setErro(null);
    setRemovendo(chave);
    iniciar(async () => {
      const r = await acao();
      setRemovendo(null);
      if (r.erro) setErro(r.erro);
    });
  };

  return (
    <Secao titulo="Logo e fotos" descricao="Fotos do espaço e dos cortes ajudam o cliente a confiar. A imagem é reduzida antes de enviar.">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-4">
          {b.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagem do Storage da barbearia
            <img src={b.logoUrl} alt="Logo atual" className="size-20 rounded-md border border-borda object-cover" />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-md border border-dashed border-borda-forte text-label text-texto-disc">
              Sem logo
            </div>
          )}
          <div className="flex flex-wrap items-start gap-2">
            <EnviarImagem acao={trocarLogo} rotulo={b.logoUrl ? "Trocar logo" : "Enviar logo"} maximo={512} />
            {b.logoUrl && (
              <Botao
                type="button"
                variante="fantasma"
                icone={<Trash2 aria-hidden />}
                carregando={removendo === "logo"}
                textoCarregando="Removendo..."
                onClick={() => remover("logo", removerLogo)}
              >
                Remover
              </Botao>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-label font-medium text-texto-sec">Fotos</p>
            <p className="numeros text-label text-texto-disc">{b.fotos.length} de 12</p>
          </div>
          {b.fotos.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {b.fotos.map((url, i) => (
                <li key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagem do Storage da barbearia */}
                  <img src={url} alt={`Foto ${i + 1}`} className="aspect-[4/3] w-full rounded-sm border border-borda object-cover" />
                  <button
                    type="button"
                    onClick={() => remover(url, () => removerFoto(url))}
                    disabled={removendo !== null}
                    aria-label={`Remover foto ${i + 1}`}
                    className="absolute right-1.5 top-1.5 flex size-9 items-center justify-center rounded-full bg-fundo/85 text-texto transition-colors hover:bg-erro-fundo hover:text-erro disabled:opacity-50"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-texto-disc">Nenhuma foto ainda. Sem fotos, a página mostra só o nome e os serviços.</p>
          )}
          <div className="mt-4">
            <EnviarImagem acao={adicionarFoto} rotulo="Adicionar foto" desabilitado={b.fotos.length >= 12} />
          </div>
        </div>
        {erro && <p className="text-label text-erro" role="alert">{erro}</p>}
      </div>
    </Secao>
  );
}

function Horario({ funcionamento }: { funcionamento: Funcionamento[] }) {
  const { estado, pendente, aoEnviar } = useFormulario(salvarFuncionamento);
  const valores: Partial<Record<number, HorarioDia>> = {};
  for (const f of funcionamento) valores[f.diaSemana] = { inicio: f.abre, fim: f.fecha };
  return (
    <Secao titulo="Horário de funcionamento" descricao="Dia desmarcado é dia fechado. O horário de cada barbeiro se ajusta em Barbeiros.">
      <form onSubmit={aoEnviar} noValidate>
        <GradeSemana valores={valores} comAlmoco={false} erros={estado.campos} rotuloFora="Fechado" />
        <RodapeSecao estado={estado} pendente={pendente} rotulo="Salvar horário" />
      </form>
    </Secao>
  );
}

function Regras({ barbearia: b }: { barbearia: BarbeariaPainel }) {
  const { estado, pendente, aoEnviar } = useFormulario(salvarRegras);
  const erro = (c: string) => estado.campos?.[c] ?? null;
  const antecedencias = ANTECEDENCIAS.some((a) => a.valor === b.regras.antecedenciaMinutos)
    ? ANTECEDENCIAS
    : [...ANTECEDENCIAS, { valor: b.regras.antecedenciaMinutos, rotulo: `${b.regras.antecedenciaMinutos} minutos antes` }];
  const janelas = JANELAS.includes(b.regras.janelaDias) ? JANELAS : [...JANELAS, b.regras.janelaDias].sort((x, y) => x - y);

  return (
    <Secao titulo="Regras do agendamento" descricao="Valem para o link. No painel você pode encaixar fora delas.">
      <form onSubmit={aoEnviar} noValidate>
        <div className="grid gap-4 sm:grid-cols-3">
          <Selecao rotulo="Horários de" name="intervalo" defaultValue={b.regras.intervaloMinutos} erro={erro("intervalo")} dica="Ex.: de 30 em 30 = 9:00, 9:30, 10:00">
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} em {m} minutos
              </option>
            ))}
          </Selecao>
          <Selecao rotulo="Cliente marca até" name="antecedencia" defaultValue={b.regras.antecedenciaMinutos} erro={erro("antecedencia")}>
            {antecedencias.map((a) => (
              <option key={a.valor} value={a.valor}>
                {a.rotulo}
              </option>
            ))}
          </Selecao>
          <Selecao rotulo="Agenda aberta por" name="janela" defaultValue={b.regras.janelaDias} erro={erro("janela")}>
            {janelas.map((d) => (
              <option key={d} value={d}>
                {d} dias
              </option>
            ))}
          </Selecao>
        </div>
        <RodapeSecao estado={estado} pendente={pendente} rotulo="Salvar regras" />
      </form>
    </Secao>
  );
}
