import Header from "./components/Header";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import Sobre from "./components/Sobre";
import Lineup from "./components/Lineup";
import Programacao from "./components/Programacao";
import Comidas from "./components/Comidas";
import Destaques from "./components/Destaques";
import Local from "./components/Local";
import Galeria from "./components/Galeria";
import Ingresso from "./components/Ingresso";
import FaqSection from "./components/FaqSection";
import Testemunho from "./components/Testemunho";
import Patrocinadores from "./components/Patrocinadores";
import Footer from "./components/Footer";
import WhatsappFloat from "./components/WhatsappFloat";
import FacebookPixel from "./components/FacebookPixel";
import {
  getArtistas,
  getComidas,
  getConfigEvento,
  getFaq,
  getGaleria,
  getPatrocinadores,
  getProgramacao,
} from "@/lib/queries";

export const revalidate = 60;

export async function generateMetadata() {
  const config = await getConfigEvento();
  return {
    description: config.subtitulo_hero,
    openGraph: {
      title: "Festa das Nações 2026 — 11ª Edição",
      description: config.subtitulo_hero,
      ...(config.logo_url ? { images: [config.logo_url] } : {}),
    },
  };
}

export default async function Home() {
  const [config, artistas, programacao, comidas, galeria, faq, patrocinadores] =
    await Promise.all([
      getConfigEvento(),
      getArtistas(),
      getProgramacao(),
      getComidas(),
      getGaleria(),
      getFaq(),
      getPatrocinadores(),
    ]);

  const textos = config.textos;

  return (
    <>
      {config.facebook_pixel_id && <FacebookPixel pixelId={config.facebook_pixel_id} />}
      <Header config={config} />
      <Hero config={config} />
      <Marquee paises={comidas.map((c) => c.pais)} />
      <Sobre texto={config.texto_sobre} textos={textos} />
      <Lineup artistas={artistas} textos={textos} />
      <Programacao itens={programacao} textos={textos} />
      <Comidas comidas={comidas} textos={textos} />
      <Destaques textos={textos} />
      <Local endereco={config.endereco} textos={textos} />
      <Galeria itens={galeria} textos={textos} />
      <Ingresso config={config} />
      <FaqSection items={faq} textos={textos} />
      <Testemunho textos={textos} />
      <Patrocinadores patrocinadores={patrocinadores} textos={textos} />
      <Footer config={config} />
      <WhatsappFloat numero={config.whatsapp_numero} />
    </>
  );
}
