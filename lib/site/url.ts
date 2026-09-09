/*
 * O endereço público do site, para os metadados.
 *
 * Existe porque link sem `metadataBase` vira caminho relativo no HTML — e o
 * WhatsApp, o Facebook e o LinkedIn não sabem resolver caminho relativo: eles
 * simplesmente não mostram imagem nenhuma. Sem imagem, o WhatsApp cai no
 * ícone genérico da hospedagem, e um link com triângulo preto e branco tem
 * cara de vírus para quem não conhece a marca. Foi exatamente o que aconteceu.
 *
 * Dois endereços porque são dois produtos com portas de entrada próprias: o
 * PáginaPro no domínio principal e o Prospector no domínio dele.
 */

const limpar = (v: string | undefined) => (v ?? "").trim().replace(/\/+$/, "");

/** O domínio principal (o do painel e do criador de páginas). */
export function urlDoApp(): string {
  return limpar(process.env.NEXT_PUBLIC_APP_URL) || "https://paginapro.com.br";
}

/**
 * O domínio do Prospector. Sem NEXT_PUBLIC_HOST_PROSPECTOR configurado, cai
 * no domínio principal — onde as mesmas páginas atendem em /prospector.
 */
export function urlDoProspector(): string {
  const host = limpar(process.env.NEXT_PUBLIC_HOST_PROSPECTOR)
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];
  return host ? `https://${host}` : urlDoApp();
}
