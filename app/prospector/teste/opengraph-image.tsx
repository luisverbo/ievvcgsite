import { ImageResponse } from "next/og";
import { configDoTeste } from "@/lib/painel/teste";

/*
 * O cartão do TESTE GRÁTIS no WhatsApp — é este link que vai no anúncio e
 * nas conversas, então é ele que mais precisa parecer produto de verdade.
 *
 * Os dias vêm do Admin, como no resto do teste: mudar de 7 para 14 lá muda
 * aqui também. Se a leitura falhar, cai em 7 — cartão sem número seria pior
 * do que um número que o dono pode ajustar depois.
 */

export const alt = "Prospector — teste grátis, sem cartão";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

export default async function Image() {
  const dias = await configDoTeste()
    .then((c) => c.dias)
    .catch(() => 7);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f9fe",
          padding: "70px 76px",
          fontFamily: "sans-serif",
          color: "#1a1c22",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 62,
                height: 62,
                borderRadius: 18,
                background: "#25D366",
                fontSize: 36,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              P
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>Prospector</div>
          </div>
          <div
            style={{
              display: "flex",
              borderRadius: 999,
              background: "#25D366",
              padding: "12px 26px",
              fontSize: 24,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            Sem cartão
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>
            {dias} dias grátis para testar.
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#5b6070", lineHeight: 1.4 }}>
            O Agente encontra empresas no Google Maps, monta a abordagem com o nome de cada uma e
            envia pelo seu WhatsApp. Você só olha quem respondeu.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {["Sem instalar nada complicado", "Cancela quando quiser", "Em português"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 999,
                border: "2px solid #1a1c2218",
                background: "#fff",
                padding: "12px 22px",
                fontSize: 22,
                fontWeight: 600,
                color: "#3a3f4d",
              }}
            >
              {/* Um ponto desenhado no lugar do "✓": glifo fora do latim faz o
                  gerador buscar fonte na rede, e isso falha calado — o cartão
                  sairia com um quadradinho no meio da frase. */}
              <div style={{ display: "flex", width: 12, height: 12, borderRadius: 999, background: "#25D366" }} />
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
