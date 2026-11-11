import type { Metadata } from "next";
import { BotoesFixos } from "@/components/inicio/botoes-fixos";
import { Cabecalho } from "@/components/inicio/cabecalho";
import { ChamadaFinal } from "@/components/inicio/chamada-final";
import { FAQ } from "@/components/inicio/conteudo";
import { Hero } from "@/components/inicio/hero";
import { Rodape } from "@/components/inicio/rodape";
import { SecaoClienteVe } from "@/components/inicio/secao-cliente-ve";
import { SecaoDepoimentos } from "@/components/inicio/secao-depoimentos";
import { SecaoDiferenciais } from "@/components/inicio/secao-diferenciais";
import { SecaoDor } from "@/components/inicio/secao-dor";
import { SecaoFaq } from "@/components/inicio/secao-faq";
import { SecaoPainel } from "@/components/inicio/secao-painel";
import { SecaoPassos } from "@/components/inicio/secao-passos";
import { Aberta24h } from "@/components/vitrine/aberta-24h";
import fotoCadeiras from "@/public/vitrine/cadeiras.jpg";

/*
 * Página inicial do Vai de Corte.
 * Os textos ficam em components/inicio/conteudo.ts; cada seção tem o próprio arquivo em components/inicio.
 * Para trocar a ordem das seções, é só mudar a ordem aqui embaixo.
 */

const TITULO = "Vai de Corte | Agendamento online para barbearias";
const DESCRICAO =
  "Link de agendamento para a sua barbearia: o cliente escolhe serviço, barbeiro e horário sozinho, e você acompanha a agenda de cada barbeiro num painel. Grátis, sem cartão.";

export const metadata: Metadata = {
  title: { absolute: TITULO },
  description: DESCRICAO,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Vai de Corte",
    title: TITULO,
    description: DESCRICAO,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO },
};

// Dados estruturados para o Google: o que é o produto e as perguntas frequentes.
const dadosEstruturados = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Vai de Corte",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: DESCRICAO,
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    areaServed: "BR",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.pergunta,
      acceptedAnswer: { "@type": "Answer", text: f.resposta },
    })),
  },
];

export default function PaginaInicial() {
  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados).replace(/</g, "\\u003c") }}
      />
      <Cabecalho />
      <main className="flex-1">
        <Hero />
        <SecaoDor />
        <SecaoPassos />
        <SecaoClienteVe />
        <Aberta24h foto={fotoCadeiras} alt="Salão de barbearia vazio, com cadeiras antigas em fila e piso xadrez" />
        <SecaoPainel />
        <SecaoDiferenciais />
        <SecaoDepoimentos />
        <SecaoFaq />
        <ChamadaFinal />
      </main>
      <Rodape />
      <BotoesFixos />
    </div>
  );
}
