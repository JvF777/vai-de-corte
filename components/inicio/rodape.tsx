import Link from "next/link";
import { LogoCompleta } from "@/components/marca";
import { LARGURA } from "./base";
import { LINKS, RODAPE } from "./conteudo";

const GRUPOS = [
  {
    titulo: "Conheça",
    links: [
      { href: "#como-funciona", rotulo: "Como funciona" },
      { href: "#recursos", rotulo: "Recursos" },
      { href: "#duvidas", rotulo: "Dúvidas" },
    ],
  },
  {
    titulo: "Para a barbearia",
    links: [
      { href: LINKS.cadastro, rotulo: "Cadastrar barbearia" },
      { href: LINKS.entrar, rotulo: "Entrar no painel" },
      { href: LINKS.exemplo, rotulo: "Ver uma barbearia de exemplo" },
    ],
  },
];

export function Rodape() {
  return (
    <footer id="rodape" className="border-t border-borda bg-fundo">
      <div className={`${LARGURA} grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:py-20`}>
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href="/" aria-label="Vai de Corte, página inicial" className="inline-flex">
            <LogoCompleta className="h-20 w-auto" />
          </Link>
          <p className="mt-5 max-w-[36ch] text-base text-texto-sec">{RODAPE.frase}</p>
        </div>
        {GRUPOS.map((g) => (
          <nav key={g.titulo} aria-label={g.titulo}>
            <h2 className="font-titulo text-subtitulo font-semibold">{g.titulo}</h2>
            <ul className="mt-4 flex flex-col gap-1">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-10 items-center text-base text-texto-sec transition-colors hover:text-ouro">
                    {l.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-borda bg-superficie">
        <div className={`${LARGURA} flex flex-col gap-2 py-6 text-label text-texto-disc lg:flex-row lg:justify-between`}>
          <p>© 2026 Vai de Corte. Pedimos só nome e WhatsApp do cliente, e cada barbearia vê apenas os próprios clientes.</p>
          <p>{RODAPE.creditos}</p>
        </div>
      </div>
    </footer>
  );
}
