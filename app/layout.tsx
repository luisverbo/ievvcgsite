import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  weight: ["700", "800"],
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PáginaPro — Landing pages e funis que convertem",
  description:
    "Crie landing pages lindas e funis de venda em minutos, com métricas nativas, WhatsApp e templates prontos por nicho. 100% em português.",
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
