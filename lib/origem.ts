// Descobre de onde a visita veio. Prioriza utm_source (confiável, vindo do
// link) e cai para o referrer do navegador. Facebook/Instagram costumam
// esconder o referrer, então o ideal é usar links com ?utm_source=instagram.
export function detectarOrigem(): string {
  if (typeof window === "undefined") return "Direto";

  const params = new URLSearchParams(window.location.search);
  const utm = (params.get("utm_source") || "").toLowerCase().trim();
  const mapUtm = (v: string) => {
    if (v.includes("insta") || v === "ig") return "Instagram";
    if (v.includes("face") || v === "fb") return "Facebook";
    if (v.includes("whats") || v === "wa") return "WhatsApp";
    if (v.includes("google")) return "Google";
    if (v.includes("tiktok")) return "TikTok";
    if (v.includes("youtube") || v === "yt") return "YouTube";
    return v.charAt(0).toUpperCase() + v.slice(1);
  };
  if (utm) return mapUtm(utm);

  const ref = document.referrer;
  if (!ref) return "Direto";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host === window.location.hostname) return "Direto";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("facebook") || host.includes("fb.")) return "Facebook";
    if (host.includes("whatsapp") || host.includes("wa.me")) return "WhatsApp";
    if (host.includes("google")) return "Google";
    if (host.includes("tiktok")) return "TikTok";
    if (host.includes("youtube") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("t.co") || host.includes("twitter") || host === "x.com") return "Twitter/X";
    if (host.includes("bing")) return "Bing";
    return host;
  } catch {
    return "Direto";
  }
}
