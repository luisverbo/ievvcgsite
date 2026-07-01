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

  return (
    <>
      <Header />
      <Hero config={config} />
      <Marquee />
      <Sobre texto={config.texto_sobre} />
      <Lineup artistas={artistas} />
      <Programacao itens={programacao} />
      <Comidas comidas={comidas} />
      <Destaques />
      <Local endereco={config.endereco} />
      <Galeria itens={galeria} />
      <Ingresso config={config} />
      <FaqSection items={faq} />
      <Testemunho />
      <Patrocinadores patrocinadores={patrocinadores} />
      <Footer config={config} />
      <WhatsappFloat />
    </>
  );
}
