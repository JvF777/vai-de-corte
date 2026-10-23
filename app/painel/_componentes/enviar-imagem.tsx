"use client";

import { useRef, useState, useTransition } from "react";
import { ImageUp } from "lucide-react";
import { Botao, type VarianteBotao } from "@/components/ui/botao";
import { comprimirImagem } from "@/lib/painel/comprimir-imagem";

type Props = {
  /** Server Action que recebe o arquivo em "arquivo" (mais os campos extras). */
  acao: (dados: FormData) => Promise<{ erro: string | null }>;
  rotulo: string;
  campos?: Record<string, string>;
  variante?: VarianteBotao;
  /** Lado maior da imagem depois de reduzida. */
  maximo?: number;
  desabilitado?: boolean;
};

/** Botão que abre a galeria/câmera, reduz a imagem no navegador e envia. */
export function EnviarImagem({ acao, rotulo, campos, variante = "secundario", maximo, desabilitado }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1.5">
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          if (!arquivo) return;
          setErro(null);
          iniciar(async () => {
            const dados = new FormData();
            dados.set("arquivo", await comprimirImagem(arquivo, maximo));
            for (const [k, v] of Object.entries(campos ?? {})) dados.set(k, v);
            const r = await acao(dados);
            if (r.erro) setErro(r.erro);
          });
        }}
      />
      <Botao
        type="button"
        variante={variante}
        icone={<ImageUp aria-hidden />}
        carregando={enviando}
        textoCarregando="Enviando..."
        disabled={desabilitado}
        onClick={() => entrada.current?.click()}
      >
        {rotulo}
      </Botao>
      {erro && (
        <p className="text-label text-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
