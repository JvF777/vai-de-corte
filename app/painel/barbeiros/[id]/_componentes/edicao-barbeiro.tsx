"use client";

import { useState, useTransition } from "react";
import { CalendarOff, Trash2 } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { AreaTexto } from "@/components/ui/area-texto";
import { Avatar } from "@/components/ui/avatar";
import { Botao } from "@/components/ui/botao";
import { Caixa } from "@/components/ui/caixa";
import { Campo } from "@/components/ui/campo";
import { horaCurta } from "@/app/barbearia/[slug]/_componentes/funcionamento";
import { paraLocal, type Funcionamento } from "@/lib/availability";
import { formatarDataLonga, formatarDuracao } from "@/lib/formatos";
import type { BarbeiroPainel, BloqueioPainel, ServicoPainel } from "@/lib/painel/dados";
import { useFormulario } from "@/lib/painel/use-formulario";
import { EnviarImagem } from "../../../_componentes/enviar-imagem";
import { GradeSemana, type HorarioDia } from "../../../_componentes/grade-semana";
import { RodapeSecao, Secao } from "../../../_componentes/secao";
import {
  adicionarFolga,
  removerFolga,
  removerFotoBarbeiro,
  salvarHorarios,
  salvarPerfil,
  salvarServicosBarbeiro,
  trocarFotoBarbeiro,
} from "../../actions";

type Props = {
  barbeiro: BarbeiroPainel;
  servicos: ServicoPainel[];
  funcionamento: Funcionamento[];
  folgas: BloqueioPainel[];
  recemCriado: boolean;
};

export function EdicaoBarbeiro({ barbeiro, servicos, funcionamento, folgas, recemCriado }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar nome={barbeiro.nome} url={barbeiro.fotoUrl} tamanho="lg" />
        <div className="min-w-0">
          <h1 className="truncate font-titulo text-[1.625rem] font-bold leading-tight tracking-[-0.02em] sm:text-titulo">{barbeiro.nome}</h1>
          <p className="mt-1 text-texto-sec">
            {barbeiro.ativo ? "Aparece no link de agendamento" : "Fora do link de agendamento"}
            {barbeiro.temLogin ? ". Tem acesso ao painel." : "."}
          </p>
        </div>
      </header>

      {recemCriado && (
        <Aviso tipo="sucesso" titulo="Barbeiro cadastrado">
          Ele já aparece no link com o horário da barbearia e todos os serviços. Confira abaixo os dias, o almoço e o que ele faz.
        </Aviso>
      )}

      <Perfil barbeiro={barbeiro} />
      <Horarios barbeiro={barbeiro} funcionamento={funcionamento} />
      <Servicos barbeiro={barbeiro} servicos={servicos} />
      <Folgas barbeiro={barbeiro} folgas={folgas} />
    </div>
  );
}

function Perfil({ barbeiro }: { barbeiro: BarbeiroPainel }) {
  const { estado, pendente, aoEnviar } = useFormulario(salvarPerfil);
  const erro = (c: string) => estado.campos?.[c] ?? null;
  const [removendo, iniciar] = useTransition();
  const [erroFoto, setErroFoto] = useState<string | null>(null);

  return (
    <Secao titulo="Perfil" descricao="Nome, foto e apresentação aparecem para o cliente na hora de escolher o barbeiro.">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Avatar nome={barbeiro.nome} url={barbeiro.fotoUrl} tamanho="lg" />
        <div className="flex flex-wrap items-start gap-2">
          <EnviarImagem acao={trocarFotoBarbeiro} campos={{ id: barbeiro.id }} rotulo={barbeiro.fotoUrl ? "Trocar foto" : "Enviar foto"} maximo={600} />
          {barbeiro.fotoUrl && (
            <Botao
              type="button"
              variante="fantasma"
              icone={<Trash2 aria-hidden />}
              carregando={removendo}
              textoCarregando="Removendo..."
              onClick={() =>
                iniciar(async () => {
                  const r = await removerFotoBarbeiro(barbeiro.id);
                  setErroFoto(r.erro);
                })
              }
            >
              Remover
            </Botao>
          )}
        </div>
        {erroFoto && <p className="basis-full text-label text-erro">{erroFoto}</p>}
      </div>

      <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="id" value={barbeiro.id} />
        <Campo rotulo="Nome" name="nome" defaultValue={barbeiro.nome} maxLength={80} erro={erro("nome")} />
        <AreaTexto rotulo="Apresentação (opcional)" name="bio" defaultValue={barbeiro.bio ?? ""} maxLength={500} erro={erro("bio")} />
        <Caixa
          name="ativo"
          value="sim"
          defaultChecked={barbeiro.ativo}
          rotulo="Aparece no link de agendamento"
          dica="Desmarque se ele saiu da barbearia ou está afastado. Os agendamentos antigos continuam no histórico."
        />
        <RodapeSecao estado={estado} pendente={pendente} />
      </form>
    </Secao>
  );
}

function Horarios({ barbeiro, funcionamento }: { barbeiro: BarbeiroPainel; funcionamento: Funcionamento[] }) {
  const { estado, pendente, aoEnviar } = useFormulario(salvarHorarios);
  const valores: Partial<Record<number, HorarioDia>> = {};
  for (const j of barbeiro.jornadas) valores[j.diaSemana] = { inicio: j.inicio, fim: j.fim, almocoInicio: j.almocoInicio, almocoFim: j.almocoFim };
  const daBarbearia = (dia: number) => funcionamento.find((f) => f.diaSemana === dia);

  return (
    <Secao titulo="Dias e horários" descricao="Dia desmarcado é folga fixa. O link só oferece horários dentro do expediente dele e da barbearia.">
      <form onSubmit={aoEnviar} noValidate>
        <input type="hidden" name="id" value={barbeiro.id} />
        <GradeSemana
          valores={valores}
          comAlmoco
          erros={estado.campos}
          rotuloFora="Folga"
          padrao={(dia) => {
            const f = daBarbearia(dia);
            return f ? { inicio: f.abre, fim: f.fecha } : { inicio: "09:00", fim: "18:00" };
          }}
          dica={(dia) => {
            const f = daBarbearia(dia);
            return f ? `Barbearia abre ${horaCurta(f.abre)} às ${horaCurta(f.fecha)}` : "A barbearia não abre nesse dia";
          }}
        />
        <RodapeSecao estado={estado} pendente={pendente} rotulo="Salvar horários" />
      </form>
    </Secao>
  );
}

function Servicos({ barbeiro, servicos }: { barbeiro: BarbeiroPainel; servicos: ServicoPainel[] }) {
  const { estado, pendente, aoEnviar } = useFormulario(salvarServicosBarbeiro);
  return (
    <Secao titulo="Serviços que faz" descricao="O cliente só vê este barbeiro quando escolhe um desses serviços.">
      {servicos.length === 0 ? (
        <p className="text-texto-sec">Nenhum serviço cadastrado ainda. Cadastre em Serviços.</p>
      ) : (
        <form onSubmit={aoEnviar} noValidate>
          <input type="hidden" name="id" value={barbeiro.id} />
          <div className="grid sm:grid-cols-2">
            {servicos.map((s) => (
              <Caixa
                key={s.id}
                name="servicos"
                value={s.id}
                defaultChecked={barbeiro.servicoIds.includes(s.id)}
                rotulo={s.nome}
                dica={`${formatarDuracao(s.duracaoMinutos)}${s.ativo ? "" : ", fora do link"}`}
              />
            ))}
          </div>
          <RodapeSecao estado={estado} pendente={pendente} rotulo="Salvar serviços" />
        </form>
      )}
    </Secao>
  );
}

function Folgas({ barbeiro, folgas }: { barbeiro: BarbeiroPainel; folgas: BloqueioPainel[] }) {
  const { estado, pendente, aoEnviar } = useFormulario(adicionarFolga, undefined, { limpar: true });
  const erro = (c: string) => estado.campos?.[c] ?? null;
  const [removendo, iniciar] = useTransition();
  const [erroRemover, setErroRemover] = useState<string | null>(null);
  const [hoje] = useState(() => paraLocal(new Date()).data);

  const periodo = (f: BloqueioPainel) => {
    const ultimo = new Date(new Date(f.fim).getTime() - 1);
    const ini = formatarDataLonga(f.inicio);
    const fim = formatarDataLonga(ultimo);
    return ini === fim ? ini : `${ini} até ${fim}`;
  };

  return (
    <Secao titulo="Folgas e férias" descricao="Dias em que ele não atende, além das folgas fixas da semana. Somem do link na hora.">
      {folgas.length > 0 && (
        <ul className="mb-5 divide-y divide-borda rounded-sm border border-borda">
          {folgas.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2">
              <div className="min-w-0">
                <p className="first-letter:uppercase">{periodo(f)}</p>
                {f.motivo && <p className="truncate text-label text-texto-sec">{f.motivo}</p>}
              </div>
              <Botao
                type="button"
                variante="fantasma"
                icone={<Trash2 aria-hidden />}
                disabled={removendo}
                aria-label={`Remover folga: ${periodo(f)}`}
                onClick={() =>
                  iniciar(async () => {
                    const r = await removerFolga(f.id);
                    setErroRemover(r.erro);
                  })
                }
              >
                <span className="hidden sm:inline">Remover</span>
              </Botao>
            </li>
          ))}
        </ul>
      )}
      {erroRemover && <p className="mb-4 text-label text-erro">{erroRemover}</p>}

      <form onSubmit={aoEnviar} noValidate>
        <input type="hidden" name="id" value={barbeiro.id} />
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr]">
          <Campo rotulo="Primeiro dia" type="date" name="de" min={hoje} erro={erro("de")} className="numeros" />
          <Campo rotulo="Último dia" type="date" name="ate" min={hoje} erro={erro("ate")} className="numeros" />
          <Campo rotulo="Motivo (opcional)" name="motivo" maxLength={200} placeholder="Ex.: férias" erro={erro("motivo")} />
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
          <Botao type="submit" variante="secundario" icone={<CalendarOff aria-hidden />} carregando={pendente} textoCarregando="Salvando..." className="sm:self-end">
            Adicionar folga
          </Botao>
        </div>
      </form>
    </Secao>
  );
}
