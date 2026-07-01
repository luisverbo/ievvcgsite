import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { getConfigEvento } from "@/lib/queries";
import { buildThemeCss, googleFontsHref } from "@/lib/theme";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  weight: "800",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Festa das Nações 2026 — 11ª Edição",
  description:
    "6 continentes · 16 países · 2 dias de festa. Comida típica, shows gospel ao vivo, área kids e bazar.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getConfigEvento();
  // Overrides de cores/fontes escolhidos no painel. Ficam fora das @layer do
  // Tailwind, então vencem os valores padrão do @theme.
  const themeCss = buildThemeCss(config.tema);
  const fontsHref = googleFontsHref(config.tema);

  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${figtree.variable}`}>
      <body className={figtree.className}>
        {fontsHref && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={fontsHref} />
          </>
        )}
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
        {children}
      </body>
    </html>
  );
}
