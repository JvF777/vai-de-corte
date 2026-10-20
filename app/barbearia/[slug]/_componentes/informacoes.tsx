import { AtSign, ExternalLink, MessageCircle } from "lucide-react";
import { diaDaSemana, paraLocal, type Funcionamento } from "@/lib/availability";
import { formatarWhatsapp, linkWhatsapp } from "@/lib/formatos";
import type { Barbearia } from "@/lib/vitrine";
import { NOMES_DIAS, horaCurta } from "./funcionamento";

// Semana começando na segunda, como a barbearia pensa.
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

/** Coluna lateral: onde fica, quando abre e como falar com a barbearia. */
export function Informacoes({
  barbearia,
  funcionamento,
  agora,
}: {
  barbearia: Barbearia;
  funcionamento: Funcionamento[];
  agora: Date;
}) {
  const hoje = diaDaSemana(paraLocal(agora).data);
  const local = [barbearia.endereco, [barbearia.cidade, barbearia.uf].filter(Boolean).join(" - ")].filter(Boolean);
  const mapa =
    barbearia.mapsUrl ??
    (local.length ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local.join(", "))}` : null);

  return (
    <aside className="flex flex-col gap-10 lg:sticky lg:top-8 lg:self-start" aria-label="Informações da barbearia">
      {local.length > 0 && (
        <div>
          <h2 className="font-titulo text-subtitulo font-semibold">Endereço</h2>
          <address className="mt-3 not-italic text-texto-sec">
            {local.map((linha) => (
              <span key={linha} className="block">
                {linha}
              </span>
            ))}
          </address>
          {mapa && (
            <a
              href={mapa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-sm text-base font-medium text-ouro-hover underline-offset-4 hover:underline"
            >
              Abrir no mapa
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </div>
      )}

      {funcionamento.length > 0 && (
        <div>
          <h2 className="font-titulo text-subtitulo font-semibold">Horário de funcionamento</h2>
          <dl className="mt-3 flex flex-col">
            {ORDEM_SEMANA.map((dia) => {
              const f = funcionamento.find((x) => x.diaSemana === dia);
              const ehHoje = dia === hoje;
              return (
                <div
                  key={dia}
                  className={`numeros flex justify-between gap-4 border-b border-borda py-2 last:border-b-0 ${ehHoje ? "text-texto" : "text-texto-sec"}`}
                >
                  <dt className={ehHoje ? "font-semibold" : undefined}>
                    {NOMES_DIAS[dia]}
                    {ehHoje && <span className="ml-2 text-label font-medium text-ouro">hoje</span>}
                  </dt>
                  <dd className={f ? undefined : "text-texto-disc"}>
                    {f ? `${horaCurta(f.abre)} às ${horaCurta(f.fecha)}` : "Fechado"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {(barbearia.whatsapp || barbearia.instagram) && (
        <div>
          <h2 className="font-titulo text-subtitulo font-semibold">Contato</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {barbearia.whatsapp && (
              <li>
                <a
                  href={linkWhatsapp(barbearia.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2.5 rounded-sm text-texto-sec transition-colors hover:text-texto"
                >
                  <MessageCircle className="size-[18px] text-texto-disc" aria-hidden />
                  <span className="numeros">{formatarWhatsapp(barbearia.whatsapp)}</span>
                  <span className="sr-only">(abre o WhatsApp)</span>
                </a>
              </li>
            )}
            {barbearia.instagram && (
              <li>
                <a
                  href={`https://instagram.com/${barbearia.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2.5 rounded-sm text-texto-sec transition-colors hover:text-texto"
                >
                  <AtSign className="size-[18px] text-texto-disc" aria-hidden />
                  {barbearia.instagram.replace(/^@/, "")}
                  <span className="sr-only">(Instagram)</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      )}
    </aside>
  );
}
