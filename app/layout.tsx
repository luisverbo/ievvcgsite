import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

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
