import { ImageResponse } from "next/og";

/*
 * O cartão que aparece quando o link do Prospector é colado no WhatsApp.
 *
 * Sem esta imagem o WhatsApp mostrava o ícone genérico da hospedagem — um
 * triângulo preto e branco que, num link recebido de desconhecido, tem cara
 * de vírus. Como o produto é justamente abordar empresas por WhatsApp, o
 * primeiro contato começava perdendo confiança.
 *
 * Desenhada na língua da landing (fundo claro, verde do WhatsApp, cores do
 * Google) para o cartão e a página serem a mesma coisa.
 */

export const alt = "Prospector — o Agente encontra empresas no Google e aborda pelo seu WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
        {/* A marca */}
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
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>Prospector</div>
            <div style={{ fontSize: 20, color: "#5b6070" }}>prospecção no WhatsApp, no automático</div>
          </div>
        </div>

        {/* A promessa */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 62, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5 }}>
            Ele acha as empresas e fala com elas por você.
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#5b6070", lineHeight: 1.4 }}>
            O Agente varre o Google Maps, monta a lista com telefone e nota, e aborda pelo seu
            WhatsApp — com o nome de cada empresa, no ritmo de gente.
          </div>
        </div>

        {/* As provas curtas */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {[
            { t: "Google Maps", c: "#4285F4" },
            { t: "Seu WhatsApp", c: "#25D366" },
            { t: "Funil e respostas", c: "#EA4335" },
          ].map((p) => (
            <div
              key={p.t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 999,
                border: `2px solid ${p.c}33`,
                background: `${p.c}14`,
                padding: "12px 22px",
                fontSize: 23,
                fontWeight: 700,
                color: p.c,
              }}
            >
              <div style={{ display: "flex", width: 11, height: 11, borderRadius: 999, background: p.c }} />
              {p.t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
