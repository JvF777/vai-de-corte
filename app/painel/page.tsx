import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ExternalLink, Scissors, UserRound, Users } from "lucide-react";
import { obterContextoPainel } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

export default function PaginaPainel() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />}>
      <ConteudoPainel />
    </Suspense>
  );
}

async function ConteudoPainel() {
  const { atual } = await obterContextoPainel();

  if (!atual) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-bold">Seu usuário ainda não está ligado a nenhuma barbearia</h1>
        <p className="mt-2 text-sm text-zinc-700">
          O login funcionou, mas falta dar acesso a uma barbearia. Peça para o suporte rodar o
          script <code>supabase/scripts/vincular_usuario.sql</code> com o seu e-mail.
        </p>
      </section>
    );
  }

  // Contagens feitas com a sessão do usuário: o RLS garante que só vêm dados desta barbearia.
  const supabase = await criarClienteServidor();
  const contar = async (tabela: "servicos" | "barbeiros" | "clientes") => {
    const { count } = await supabase
      .from(tabela)
      .select("id", { count: "exact", head: true })
      .eq("barbearia_id", atual.barbeariaId);
    return count ?? 0;
  };
  const [servicos, barbeiros, clientes] = await Promise.all([
    contar("servicos"),
    contar("barbeiros"),
    contar("clientes"),
  ]);

  const cartoes = [
    { rotulo: "Serviços", valor: servicos, Icone: Scissors },
    { rotulo: "Barbeiros", valor: barbeiros, Icone: UserRound },
    { rotulo: "Clientes", valor: clientes, Icone: Users },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-sm text-zinc-500">{atual.papel === "dono" ? "Dono" : "Barbeiro"}</p>
        <h1 className="text-2xl font-bold">{atual.nome}</h1>
        <Link
          href={`/barbearia/${atual.slug}`}
          className="mt-1 inline-flex items-center gap-1 text-sm text-zinc-600 underline underline-offset-2"
        >
          Link de agendamento: /barbearia/{atual.slug}
          <ExternalLink className="size-3.5" />
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cartoes.map(({ rotulo, valor, Icone }) => (
          <div key={rotulo} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Icone className="size-4" />
              {rotulo}
            </div>
            <p className="mt-1 text-3xl font-bold">{valor}</p>
          </div>
        ))}
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">
        <CalendarDays className="mt-0.5 size-5 shrink-0" />
        <p>A agenda, os cadastros e as métricas do dia chegam nas próximas etapas.</p>
      </section>
    </div>
  );
}
