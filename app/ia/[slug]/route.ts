import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("sites_ia")
    .select("id, org_id, html, publicado")
    .eq("slug", slug)
    .maybeSingle();

  const site = data as { id: string; org_id: string; html: string; publicado: boolean } | null;
  if (!site?.publicado || !site.html) {
    return new Response("Não encontrado", { status: 404 });
  }

  const script = scriptMetricas(site.org_id, site.id);
  // Replacer em função: se o script tivesse "$&" etc., o replace de string
  // interpretaria como padrão especial e corromperia a página.
  const html = /<\/body>/i.test(site.html)
    ? site.html.replace(/<\/body>/i, () => `${script}</body>`)
    : site.html + script;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
