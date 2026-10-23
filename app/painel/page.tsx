import { Suspense } from "react";
import { obterContextoPainel } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Contador } from "@/components/animacao/contador";
import { Revelar } from "@/components/animacao/revelar";
import { Aviso } from "@/components/ui/aviso";
import { Painel } from "@/components/ui/painel";
import { LinkBotao } from "@/components/ui/botao";
import { CalendarDays } from "lucide-react";
import { CopiarLink } from "./_componentes/copiar-link";

export default function PaginaPainel() {
  return (
    <Suspense fallback={<Carregando />}>
      <ConteudoPainel />
    </Suspense>
  );
}

/** Mesmo layout da página, com barras no lugar dos valores (sem pular quando os dados chegam). */
function Carregando() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Carregando painel">
      <div>
        <div className="h-4 w-24 rounded-sm bg-elevado" />
        <div className="mt-3 h-9 w-72 max-w-full rounded-sm bg-elevado" />
      </div>
      <div className="h-[118px] rounded-md border border-borda bg-card" />
      <div className="h-44 rounded-md border border-borda bg-card" />
    </div>
  );
}

async function ConteudoPainel() {
  const { atual } = await obterContextoPainel();

  if (!atual) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-titulo text-titulo font-bold">Visão geral</h1>
        <Aviso tipo="atencao" titulo="Seu usuário ainda não está ligado a nenhuma barbearia">
          O login funcionou, mas falta liberar o acesso. Peça ao responsável pelo Vai de Corte para vincular o seu e-mail a
          uma barbearia.
        </Aviso>
      </div>
    );
  }

  // Contagens com a sessão do usuário: o RLS garante que só vêm dados desta barbearia.
  const supabase = await criarClienteServidor();
  const contar = async (tabela: "servicos" | "barbeiros" | "clientes") => {
    const { count, error } = await supabase
      .from(tabela)
      .select("id", { count: "exact", head: true })
      .eq("barbearia_id", atual.barbeariaId);
    return error ? null : (count ?? 0);
  };
  const [servicos, barbeiros, clientes] = await Promise.all([
    contar("servicos"),
    contar("barbeiros"),
    contar("clientes"),
  ]);

  const indicadores = [
    { rotulo: "Serviços", valor: servicos },
    { rotulo: "Barbeiros", valor: barbeiros },
    { rotulo: "Clientes", valor: clientes },
  ];

  return (
    <Revelar className="flex flex-col gap-8">
      <header data-anima>
        <p className="text-label text-texto-sec">{atual.papel === "dono" ? "Você é dono desta barbearia" : "Você é barbeiro desta barbearia"}</p>
        <h1 className="mt-1 font-titulo text-[1.625rem] font-bold leading-tight tracking-[-0.02em] sm:text-titulo">{atual.nome}</h1>
      </header>

      <Painel data-anima aria-labelledby="titulo-numeros">
        <h2 id="titulo-numeros" className="sr-only">
          Números da barbearia
        </h2>
        <dl className="grid grid-cols-3 divide-x divide-borda">
          {indicadores.map(({ rotulo, valor }) => (
            <div key={rotulo} className="flex flex-col gap-1 px-4 py-5 sm:px-6 sm:py-6">
              <dt className="text-label font-medium text-texto-sec">{rotulo}</dt>
              <dd className="font-titulo text-[1.75rem] font-bold leading-none sm:text-numero">
                {valor === null ? (
                  <span className="text-base font-normal text-texto-disc" title="Não foi possível carregar">
                    —
                  </span>
                ) : (
                  <Contador valor={valor} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Painel>

      <Painel data-anima aria-labelledby="titulo-link" className="flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <h2 id="titulo-link" className="font-titulo text-subtitulo font-semibold">
            Link de agendamento
          </h2>
          <p className="mt-1 text-texto-sec">
            É por ele que o cliente marca sozinho. Coloque na bio do Instagram e no QR Code do balcão.
          </p>
        </div>
        <CopiarLink slug={atual.slug} />
      </Painel>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-anima>
        <p className="text-texto-sec">Os clientes de hoje, bloqueios e encaixes ficam na agenda.</p>
        <LinkBotao href="/painel/agenda" icone={<CalendarDays aria-hidden />}>
          Abrir a agenda
        </LinkBotao>
      </div>
    </Revelar>
  );
}
