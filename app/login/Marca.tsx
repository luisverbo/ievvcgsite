import Link from "next/link";

/*
 * A marca no topo do login e do cadastro.
 *
 * Duas portas de entrada, dois produtos: quem veio do anúncio do Prospector
 * não pode encontrar "PáginaPro — criador de sites" na primeira tela depois
 * de clicar. Ver uma marca diferente da que prometeu é o momento em que a
 * pessoa desconfia e fecha a aba.
 */
export default function Marca({ prospector }: { prospector: boolean }) {
  if (!prospector) {
    return (
      <Link href="/" className="font-display text-xl font-extrabold">
        Página<span className="text-brand-2">Pro</span>
      </Link>
    );
  }
  return (
    <Link href="/prospector" className="font-display text-xl font-extrabold tracking-tight">
      <span className="text-[#4285F4]">P</span>
      <span className="text-[#EA4335]">r</span>
      <span className="text-[#FBBC05]">o</span>
      <span className="text-[#4285F4]">s</span>
      <span className="text-[#34A853]">p</span>
      <span className="text-[#EA4335]">e</span>ctor
    </Link>
  );
}

/*
 * Veio do funil do Prospector? Duas pistas, porque as telas se ligam por
 * caminhos diferentes: o ?plano=prospector do cadastro e o destino
 * /assinar/prospector guardado no ?de= do login. O ?p=prospector cobre o
 * "Entrar" do cabeçalho da landing, que não carrega nenhum dos dois.
 */
export function ehFunilProspector(params: { plano?: string; de?: string; p?: string }): boolean {
  return (
    params.plano === "prospector" ||
    params.p === "prospector" ||
    (params.de ?? "").includes("prospector")
  );
}

/*
 * A terceira pista, e a mais forte: o endereço na barra.
 *
 * Quem entrou por prospector.luismarketing.com.br está no funil do Prospector
 * mesmo que nenhum parâmetro tenha sobrevivido ao caminho — e é o caso do
 * visitante que digita o domínio na mão ou salva o login nos favoritos.
 */
export function ehHostProspector(host: string | null | undefined): boolean {
  const alvo = (process.env.NEXT_PUBLIC_HOST_PROSPECTOR ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0];
  if (!alvo) return false;
  const h = (host ?? "").toLowerCase().split(":")[0];
  return h === alvo || h === `www.${alvo}`;
}
