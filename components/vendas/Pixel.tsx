import Script from "next/script";
import type { PixelVendas } from "@/lib/vendas-pixel";

/*
 * Os pixels no <head> das páginas de venda.
 *
 * `afterInteractive` de propósito: o pixel carrega DEPOIS da página aparecer.
 * Numa landing de anúncio, cada décimo de segundo é conversão — e um pixel
 * que atrasa a primeira pintura custa mais leads do que mede.
 *
 * Nada é renderizado quando não há ID configurado: sem script morto, sem
 * requisição à toa, sem cookie em visitante de quem não anuncia ainda.
 */
export default function Pixel({ pixel }: { pixel: PixelVendas }) {
  const { meta, google, extra } = pixel;
  if (!meta && !google && !extra) return null;

  return (
    <>
      {meta && (
        <>
          <Script id="pixel-meta" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${meta}');fbq('track','PageView');`}
          </Script>
          {/* Sem JavaScript o pixel ainda conta a visita. */}
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${meta}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      {google && (
        <>
          <Script
            id="pixel-google-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${google}`}
          />
          <Script id="pixel-google" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());gtag('config','${google}');`}
          </Script>
        </>
      )}

      {/*
       * Script colado pelo dono (TikTok, Clarity, Hotjar…). Vai como HTML
       * bruto porque é exatamente isso que essas ferramentas entregam — e
       * quem cola aqui é o ADMIN, dono do próprio site. Não é entrada de
       * usuário: a action que salva exige ehAdmin().
       */}
      {extra && <div dangerouslySetInnerHTML={{ __html: extra }} />}
    </>
  );
}

/*
 * O clique que vira venda.
 *
 * Sem isto o pixel só sabe que alguém VISITOU. Marcando o clique no botão de
 * assinar como InitiateCheckout/begin_checkout, o Meta e o Google passam a
 * otimizar por quem vai ao caixa — que é a diferença entre queimar verba com
 * curioso e achar comprador.
 *
 * Delegação num listener só, no document: os CTAs estão espalhados pela
 * página e alguns nascem dentro de blocos condicionais (o do vídeo, por
 * exemplo). Um listener global pega todos, inclusive os que aparecerem
 * depois.
 */
export function PixelCheckout() {
  return (
    <Script id="pixel-checkout" strategy="afterInteractive">
      {`document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest?e.target.closest('a[href^="/assinar/"]'):null;
  if(!a)return;
  try{ if(window.fbq) fbq('track','InitiateCheckout'); }catch(_){}
  try{ if(window.gtag) gtag('event','begin_checkout'); }catch(_){}
},true);`}
    </Script>
  );
}
