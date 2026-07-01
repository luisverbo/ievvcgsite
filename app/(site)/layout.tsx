import { getConfigEvento } from "@/lib/queries";
import { buildThemeCss, googleFontsHref } from "@/lib/theme";

// Aplica as cores e fontes personalizadas SOMENTE na landing pública.
// O painel /admin usa outro layout (o raiz), então continua com as cores
// padrão mesmo que o usuário mude o tema do site.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const config = await getConfigEvento();
  const themeCss = buildThemeCss(config.tema);
  const fontsHref = googleFontsHref(config.tema);

  return (
    <>
      {fontsHref && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={fontsHref} />
        </>
      )}
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      {children}
    </>
  );
}
