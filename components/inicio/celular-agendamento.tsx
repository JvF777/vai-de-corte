import { CalendarPlus, Check, ChevronLeft, Clock, MessageCircle, Scissors, UserRound, Users } from "lucide-react";
import { EXEMPLO_CELULAR as EX } from "./conteudo";

export type TelaCelular = "servico" | "barbeiro" | "horario" | "confirmado";

const PASSO: Record<TelaCelular, number> = { servico: 1, barbeiro: 2, horario: 3, confirmado: 4 };
const TITULO: Record<TelaCelular, string> = {
  servico: "Escolha o serviço",
  barbeiro: "Escolha o barbeiro",
  horario: "Escolha o horário",
  confirmado: "Horário reservado",
};

/**
 * Desenho de um celular com uma tela do agendamento público (dados fictícios).
 * É só ilustração: nada aqui é clicável, e leitores de tela leem a legenda de fora.
 */
export function CelularAgendamento({ tela, className = "" }: { tela: TelaCelular; className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative aspect-[9/19] w-full select-none rounded-[2.25rem] border border-borda-forte bg-[#050506] p-2 shadow-flutuante ${className}`}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-fundo">
        {/* Barra de status */}
        <div className="flex items-center justify-between px-5 pt-3 text-[0.625rem] font-semibold text-texto-sec">
          <span className="numeros">9:41</span>
          <span className="h-4 w-16 rounded-full bg-[#050506]" />
          <span className="numeros">100%</span>
        </div>
        <TelaConteudo tela={tela} />
      </div>
    </div>
  );
}

function TelaConteudo({ tela }: { tela: TelaCelular }) {
  if (tela === "confirmado") return <TelaConfirmado />;
  return (
    <div className="flex flex-1 flex-col px-4 pt-4">
      <div className="flex items-center gap-2 text-texto-sec">
        <ChevronLeft className="size-4" />
        <span className="truncate text-[0.6875rem]">{EX.barbearia}</span>
      </div>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`h-0.5 flex-1 rounded-full ${n <= PASSO[tela] ? "bg-ouro" : "bg-borda"}`} />
        ))}
      </div>
      <p className="mt-4 font-titulo text-[0.9375rem] font-bold text-texto">{TITULO[tela]}</p>
      <div className="mt-3 flex flex-1 flex-col gap-2">
        {tela === "servico" && <ListaServicos />}
        {tela === "barbeiro" && <ListaBarbeiros />}
        {tela === "horario" && <GradeHorarios />}
      </div>
      <span className="mb-4 rounded-sm bg-ouro py-2.5 text-center text-[0.75rem] font-semibold text-sobre-ouro">Continuar</span>
    </div>
  );
}

function ListaServicos() {
  return EX.servicos.map((s) => {
    const ativo = s.nome === EX.escolhido.servico;
    return (
      <div
        key={s.nome}
        className={`flex items-center gap-2.5 rounded-md border p-2.5 ${ativo ? "border-ouro bg-ouro/10" : "border-borda bg-card"}`}
      >
        <span className="inline-flex size-7 items-center justify-center rounded-sm bg-elevado text-ouro">
          <Scissors className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.75rem] font-medium text-texto">{s.nome}</span>
          <span className="flex items-center gap-1 text-[0.625rem] text-texto-disc">
            <Clock className="size-2.5" />
            {s.duracao}
          </span>
        </span>
        <span className="numeros text-[0.75rem] font-semibold text-ouro">{s.preco}</span>
      </div>
    );
  });
}

function ListaBarbeiros() {
  return EX.barbeiros.map((b, i) => {
    const ativo = b === EX.escolhido.barbeiro;
    return (
      <div
        key={b}
        className={`flex items-center gap-2.5 rounded-md border p-2.5 ${ativo ? "border-ouro bg-ouro/10" : "border-borda bg-card"}`}
      >
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-elevado text-texto-sec">
          {i === 0 ? <Users className="size-3.5" /> : <UserRound className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.75rem] font-medium text-texto">{b}</span>
          <span className="block text-[0.625rem] text-texto-disc">{i === 0 ? "Quem estiver livre" : "Horários hoje"}</span>
        </span>
        {ativo && <Check className="size-3.5 text-ouro" />}
      </div>
    );
  });
}

function GradeHorarios() {
  return (
    <>
      <p className="text-[0.6875rem] text-texto-sec">{EX.dia}</p>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {EX.horarios.map((h) => {
          const ativo = h === EX.escolhido.horario;
          return (
            <span
              key={h}
              className={`numeros rounded-sm border py-2 text-center text-[0.6875rem] font-medium ${
                ativo ? "border-ouro bg-ouro text-sobre-ouro" : "border-borda bg-card text-texto"
              }`}
            >
              {h}
            </span>
          );
        })}
      </div>
    </>
  );
}

function TelaConfirmado() {
  const { servico, barbeiro, horario } = EX.escolhido;
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full border border-ouro text-ouro">
        <Check className="size-5" />
      </span>
      <p className="mt-4 font-titulo text-[1rem] font-bold text-texto">Horário reservado</p>
      <p className="mt-1 text-[0.6875rem] text-texto-sec">{EX.barbearia}</p>
      <div className="mt-5 rounded-md border border-borda bg-card p-3 text-left text-[0.6875rem]">
        <Linha rotulo="Serviço" valor={servico} />
        <Linha rotulo="Barbeiro" valor={barbeiro} />
        <Linha rotulo="Quando" valor={`Sáb, 14/11 · ${horario}`} />
      </div>
      <div className="mt-auto mb-4 flex flex-col gap-1.5">
        <span className="flex items-center justify-center gap-1.5 rounded-sm bg-ouro py-2.5 text-[0.75rem] font-semibold text-sobre-ouro">
          <MessageCircle className="size-3.5" />
          Avisar no WhatsApp
        </span>
        <span className="flex items-center justify-center gap-1.5 rounded-sm border border-borda-forte py-2.5 text-[0.75rem] font-medium text-texto">
          <CalendarPlus className="size-3.5" />
          Salvar no Google Agenda
        </span>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-borda py-1.5 last:border-0">
      <span className="text-texto-disc">{rotulo}</span>
      <span className="truncate font-medium text-texto">{valor}</span>
    </div>
  );
}
