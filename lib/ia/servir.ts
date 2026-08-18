import "server-only";

// Serve a página gerada pela IA. É um documento HTML inteiro escrito pela
// Claude, então devolvemos o corpo cru — sem passar pelo layout do app —
// injetando antes o script de métricas (visitas, origem, cliques em .cta e
// mapa de calor de rolagem), igual às páginas de blocos.

// Mesma lógica do components/site/Analytics.tsx, em JS puro, porque aqui não
// há React. A anon key é pública por definição (vai em todo site publicado).
function scriptMetricas(orgId: string, siteIaId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return `<script>(function(){
var URL_API=${JSON.stringify(url)},ANON=${JSON.stringify(anon)};
var BASE={org_id:${JSON.stringify(orgId)},site_id:${JSON.stringify(siteIaId)},pagina_id:null,funil_id:null};
function origem(){try{
var u=(new URLSearchParams(location.search).get('utm_source')||'').toLowerCase();
function m(v){if(v.indexOf('insta')>-1||v==='ig')return'Instagram';if(v.indexOf('face')>-1||v==='fb')return'Facebook';if(v.indexOf('whats')>-1||v==='wa')return'WhatsApp';if(v.indexOf('google')>-1)return'Google';if(v.indexOf('tiktok')>-1)return'TikTok';if(v.indexOf('youtube')>-1||v==='yt')return'YouTube';return v.charAt(0).toUpperCase()+v.slice(1);}
if(u)return m(u);
var r=document.referrer;if(!r)return'Direto';
var h=new URL(r).hostname.replace(/^www\\./,'');
if(h===location.hostname)return'Direto';
if(h.indexOf('instagram')>-1)return'Instagram';if(h.indexOf('facebook')>-1||h.indexOf('fb.')>-1)return'Facebook';
if(h.indexOf('whatsapp')>-1||h.indexOf('wa.me')>-1)return'WhatsApp';if(h.indexOf('google')>-1)return'Google';
if(h.indexOf('tiktok')>-1)return'TikTok';if(h.indexOf('youtube')>-1||h.indexOf('youtu.be')>-1)return'YouTube';
if(h.indexOf('t.co')>-1||h.indexOf('twitter')>-1||h==='x.com')return'Twitter/X';if(h.indexOf('bing')>-1)return'Bing';
return h;}catch(e){return'Direto';}}
function enviar(extra){var b={};for(var k in BASE)b[k]=BASE[k];for(var k2 in extra)b[k2]=extra[k2];
try{fetch(URL_API+'/rest/v1/analytics_eventos',{method:'POST',keepalive:true,headers:{'apikey':ANON,'Authorization':'Bearer '+ANON,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(b)});}catch(e){}}
enviar({tipo:'pageview',path:location.pathname,referrer:document.referrer||null,origem:origem()});
document.addEventListener('click',function(e){
var el=e.target&&e.target.closest?e.target.closest('[data-track],.cta'):null;if(!el)return;
var rot=el.getAttribute('data-track')||(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,80)||'CTA';
enviar({tipo:'click',rotulo:rot,path:location.pathname,origem:origem()});});
var inicio=Date.now(),maxScroll=0,zonas={};
function zonaAtual(){var t=Math.max(1,document.documentElement.scrollHeight);var c=window.scrollY+window.innerHeight/2;var p=Math.min(100,Math.max(1,c/t*100));return Math.min(100,Math.ceil(p/10)*10);}
function medir(){var t=Math.max(1,document.documentElement.scrollHeight);var v=Math.min(100,(window.scrollY+window.innerHeight)/t*100);var z=Math.min(100,Math.ceil(v/10)*10);if(z>maxScroll)maxScroll=z;}
medir();addEventListener('scroll',medir,{passive:true});
setInterval(function(){if(document.visibilityState!=='visible')return;var z=String(zonaAtual());zonas[z]=(zonas[z]||0)+1;medir();},1000);
var saiu=false;
function saida(){if(saiu)return;var t=Math.round((Date.now()-inicio)/1000);if(t<1)return;saiu=true;
var p=JSON.stringify({org_id:BASE.org_id,site_id:BASE.site_id,path:location.pathname,max_scroll:maxScroll,tempo_s:t,zonas:zonas});
navigator.sendBeacon('/api/pp-saida',new Blob([p],{type:'application/json'}));}
addEventListener('pagehide',saida);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')saida();});
})();</script>`;
}

// Meta Pixel: PageView ao abrir e um evento por clique em botão de ação.
// Fica aqui (e não no HTML da página) para poder ligar/trocar o pixel de uma
// página já criada sem a IA reescrever nada.
function scriptPixel(pixelId: string) {
  const id = JSON.stringify(pixelId);
  return `<script>(function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)})(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',${id});fbq('track','PageView');
document.addEventListener('click',function(e){
var el=e.target&&e.target.closest?e.target.closest('[data-fbq],.cta'):null;if(!el)return;
var ev=el.getAttribute('data-fbq');
if(ev)fbq('trackCustom',ev);else fbq('track','InitiateCheckout');});
</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1"></noscript>`;
}


/*
 * A jaula das páginas de cliente servidas no NOSSO domínio.
 *
 * O HTML dessas páginas é escrito pelo cliente (via IA e via codigo_head) e
 * roda em paginapro.com.br — o MESMO domínio do painel. Sem isto, qualquer
 * script publicado por um cliente leria os cookies de sessão de quem
 * estivesse logado ao abrir a página: um cliente malicioso publicaria um
 * "site" que rouba a sessão de outro cliente — ou a do admin.
 *
 * `sandbox` sem allow-same-origin dá à página uma origem opaca: os scripts
 * dela continuam rodando (animações, pixel, métricas), mas cookies e
 * localStorage do domínio ficam INACESSÍVEIS. É a mesma jaula que o
 * CodePen/JSFiddle usam para rodar código alheio.
 *
 * O domínio próprio do cliente (rota /dominio) NÃO leva a jaula: lá a página
 * já está numa origem isolada por definição — o domínio é dele.
 */
export const CSP_PAGINA_CLIENTE =
  "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals";

export type SiteServivel = {
  id: string;
  org_id: string;
  html: string;
  publicado: boolean;
  facebook_pixel_id: string | null;
  codigo_head: string | null;
};

/*
 * Monta a resposta HTML final de uma página de IA — a mesma para o endereço
 * interno (/ia/slug) e para o domínio próprio do cliente. Um lugar só, senão
 * pixel e métricas funcionariam num endereço e sumiriam no outro.
 */
export function responderPagina(site: SiteServivel): Response {
  // Pixel e tags o mais cedo possível (dentro do <head>), métricas no fim.
  const cabeca =
    (site.facebook_pixel_id ? scriptPixel(site.facebook_pixel_id) : "") + (site.codigo_head ?? "");
  const script = scriptMetricas(site.org_id, site.id);

  // Replacer em função: se o script tivesse "$&" etc., o replace de string
  // interpretaria como padrão especial e corromperia a página.
  let html = site.html;
  if (cabeca) {
    html = /<\/head>/i.test(html)
      ? html.replace(/<\/head>/i, () => `${cabeca}</head>`)
      : cabeca + html;
  }
  html = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, () => `${script}</body>`)
    : html + script;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
