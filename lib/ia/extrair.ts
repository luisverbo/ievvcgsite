// Leitura da resposta da IA. Puro de propósito (sem server-only): roda em
// qualquer lugar e dá para testar isoladamente.

// A IA responde com o documento dentro de uma cerca ```html. Se ela escapar do
// formato, ainda tentamos achar o documento solto no texto.
export function extrairHtml(texto: string): string | null {
  const cerca = /```(?:html)?\s*\n([\s\S]*?)```/i.exec(texto);
  const bruto = cerca?.[1] ?? texto;
  const inicio = bruto.search(/<!doctype html|<html[\s>]/i);
  if (inicio === -1) return null;
  const fim = bruto.toLowerCase().lastIndexOf("</html>");
  const html = fim === -1 ? bruto.slice(inicio) : bruto.slice(inicio, fim + 7);
  return html.trim() || null;
}

// Tudo que a IA escreveu fora da cerca de código vira o "recado" dela no chat.
export function extrairResumo(texto: string): string {
  const semCodigo = texto.replace(/```[\s\S]*?```/g, "").trim();
  return semCodigo || "Página atualizada.";
}
