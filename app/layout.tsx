import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { urlDoSite } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(urlDoSite()),
  title: { default: "Vai de Corte", template: "%s | Vai de Corte" },
  description: "Agendamento online para barbearias: o cliente marca sozinho pelo link.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  colorScheme: "dark",
};

// Marca o html para as animações de entrada antes da primeira pintura. Se o JS
// não carregar em 2,5 s, a marca sai e tudo aparece sem animação.
const scriptAnima = `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.classList.add('anima');setTimeout(function(){d.classList.remove('anima')},2500)}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptAnima }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
