import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { obterContextoPainel } from "@/lib/auth";
import { BotaoEnviar } from "@/components/ui/botao-enviar";
import { sair } from "../actions";
import { ListaNavegacao } from "./lista-navegacao";
import { SeletorBarbearia } from "./seletor-barbearia";

/** Miolo da barra lateral (usado na sidebar do desktop e na gaveta do celular). */
export function ConteudoLateral() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <Suspense fallback={<div className="h-11 rounded-sm bg-elevado" />}>
        <EscopoBarbearia />
      </Suspense>
      <Suspense fallback={<div className="h-72 rounded-sm" aria-hidden />}>
        <Navegacao />
      </Suspense>
      <div className="mt-auto">
        <Suspense fallback={<div className="h-24 rounded-sm bg-elevado" />}>
          <Usuario />
        </Suspense>
      </div>
    </div>
  );
}

async function Navegacao() {
  const { atual } = await obterContextoPainel();
  return <ListaNavegacao papel={atual?.papel ?? null} />;
}

async function EscopoBarbearia() {
  const { vinculos, atual } = await obterContextoPainel();
  if (!atual) return null;
  if (vinculos.length > 1) return <SeletorBarbearia vinculos={vinculos} atualId={atual.barbeariaId} />;
  return (
    <div className="rounded-sm border border-borda px-3 py-2.5">
      <p className="text-label text-texto-disc">Barbearia</p>
      <p className="truncate font-medium">{atual.nome}</p>
    </div>
  );
}

async function Usuario() {
  const { usuario, atual } = await obterContextoPainel();
  return (
    <div className="border-t border-borda pt-4">
      <p className="truncate text-base text-texto" title={usuario.email ?? undefined}>
        {usuario.email}
      </p>
      {atual && <p className="text-label text-texto-sec">{atual.papel === "dono" ? "Dono" : "Barbeiro"}</p>}
      <form action={sair} className="mt-3">
        <BotaoEnviar variante="secundario" icone={<LogOut aria-hidden />} textoCarregando="Saindo..." className="w-full">
          Sair
        </BotaoEnviar>
      </form>
    </div>
  );
}
