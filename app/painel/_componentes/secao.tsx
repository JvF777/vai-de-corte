import { useId, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Painel } from "@/components/ui/painel";
import type { EstadoFormulario } from "@/lib/painel/formulario";

/** Bloco de uma tela de cadastro: título, explicação curta e o conteúdo. */
export function Secao({ titulo, descricao, children, acao }: { titulo: string; descricao?: ReactNode; children: ReactNode; acao?: ReactNode }) {
  const id = useId();
  return (
    <Painel aria-labelledby={id}>
      <div className="flex flex-col gap-3 border-b border-borda px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <h2 id={id} className="font-titulo text-subtitulo font-semibold">
            {titulo}
          </h2>
          {descricao && <p className="mt-0.5 max-w-xl text-texto-sec">{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </Painel>
  );
}

/** Fim do formulário da seção: erro geral, "Salvo" e o botão. */
export function RodapeSecao({ estado, pendente, rotulo = "Salvar alterações" }: { estado: EstadoFormulario; pendente: boolean; rotulo?: string }) {
  return (
    <div className="mt-5 flex flex-col gap-3">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {estado.ok && !pendente && (
          <p className="flex items-center gap-1.5 text-label text-texto-sec" role="status">
            <Check className="size-4 text-ouro" aria-hidden />
            Salvo
          </p>
        )}
        <Botao type="submit" carregando={pendente} textoCarregando="Salvando...">
          {rotulo}
        </Botao>
      </div>
    </div>
  );
}
