import type { Metadata } from "next";
import { urlDoApp } from "@/lib/site/url";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

/*
 * As fontes, com pilha de reserva declarada.
 *
 * `fallback` não é enfeite: `next/font/google` baixa a fonte no BUILD, e
 * quando essa busca falha (ou o cache do build guarda um módulo pela metade)
 * a página fica sem fonte nenhuma. Com a reserva escrita, o texto continua
 * legível em vez de cair numa serifada qualquer do navegador.
 *
 * `display: "swap"` é o padrão do Next, mas vai explícito: é a diferença
 * entre o visitante ler o texto na hora ou olhar para um retângulo em branco
 * enquanto a fonte carrega.
 */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  weight: ["700", "800"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});

const TITULO = "PáginaPro — Landing pages e funis que convertem";
const DESCRICAO =
  "Crie landing pages lindas e funis de venda em minutos, com métricas nativas, WhatsApp e templates prontos por nicho. 100% em português.";

/*
 * `metadataBase` não é detalhe: sem ela o Next escreve a imagem do link como
 * caminho relativo, e WhatsApp/Facebook/LinkedIn não resolvem caminho
 * relativo — o link fica sem imagem e a hospedagem entra com o ícone
 * genérico dela. Um link com triângulo preto e branco parece vírus para
 * quem não conhece a marca, e o produto vive de mandar link no WhatsApp.
 */
export const metadata: Metadata = {
  metadataBase: new URL(urlDoApp()),
  title: TITULO,
  description: DESCRICAO,
  openGraph: {
    type: "website",
    siteName: "PáginaPro",
    locale: "pt_BR",
    url: urlDoApp(),
    title: TITULO,
    description: DESCRICAO,
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${figtree.variable}`}>
      <body className={figtree.className}>{children}</body>
    </html>
  );
}
