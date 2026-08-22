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
