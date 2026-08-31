/*
 * Leitura da planilha que o vendedor JÁ tem.
 *
 * Quem chega com uma lista própria (comprada, exportada de outro CRM, montada
 * à mão) não pode ter que redigitar tudo — importa o CSV e usa a mesma
 * máquina de abordagem. O Excel brasileiro salva com ponto e vírgula e o
 * resto do mundo com vírgula, então o separador é DETECTADO, não assumido.
 *
 * Puro de propósito: recebe texto, devolve linhas — dá para testar sem banco.
 */

export type LinhaImportada = {
  nome: string;
  telefone: string | null;
  categoria: string | null;
  endereco: string | null;
  local: string | null;
};

export const IMPORT_MAX_LINHAS = 500;

// "Razão Social" e "razao social" são a mesma coluna.
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const CABECALHOS: Record<keyof LinhaImportada, string[]> = {
  nome: ["nome", "empresa", "razao social", "cliente", "estabelecimento", "negocio", "fantasia"],
  telefone: ["telefone", "celular", "whatsapp", "fone", "tel", "contato", "numero"],
  categoria: ["categoria", "ramo", "segmento", "nicho", "atividade", "area"],
  endereco: ["endereco", "logradouro", "rua"],
  local: ["cidade", "municipio", "bairro", "local", "regiao", "uf"],
};

/*
 * Um CSV de verdade tem aspas com separador dentro ("Silva; Filhos") e aspas
 * escapadas (""). O split por separador quebraria nesses casos — por isso o
 * parser anda caractere a caractere, que é chato de escrever e certo sempre.
 */
function partirLinha(linha: string, sep: string): string[] {
  const celulas: string[] = [];
  let atual = "";
  let dentro = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (dentro) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (c === '"') {
        dentro = false;
      } else {
        atual += c;
      }
    } else if (c === '"') {
      dentro = true;
    } else if (c === sep) {
      celulas.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  celulas.push(atual);
  return celulas.map((c) => c.trim());
}

export function lerPlanilha(
  texto: string,
): { linhas: LinhaImportada[]; semTelefone: number } | { erro: string } {
  const limpo = texto.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!limpo) return { erro: "O arquivo veio vazio." };

  const linhasBrutas = limpo.split("\n").filter((l) => l.trim());
  if (linhasBrutas.length < 2) {
    return { erro: "O arquivo precisa de um cabeçalho e pelo menos uma linha de dados." };
  }

  // O separador é o que aparece mais no cabeçalho — ; , ou tabulação.
  const cab = linhasBrutas[0];
  const sep = [";", ",", "\t"].reduce((a, b) =>
    cab.split(a).length >= cab.split(b).length ? a : b,
  );

  const colunas = partirLinha(cab, sep).map(normalizar);
  const indice: Partial<Record<keyof LinhaImportada, number>> = {};
  for (const campo of Object.keys(CABECALHOS) as (keyof LinhaImportada)[]) {
    const i = colunas.findIndex((c) => CABECALHOS[campo].some((n) => c === n || c.startsWith(n)));
    if (i >= 0) indice[campo] = i;
  }

  if (indice.nome === undefined) {
    return {
      erro: `Não achei a coluna do nome da empresa. A primeira linha precisa ter um cabeçalho como "empresa" ou "nome" (colunas encontradas: ${colunas.slice(0, 6).join(", ")}).`,
    };
  }

  if (linhasBrutas.length - 1 > IMPORT_MAX_LINHAS) {
    return {
      erro: `A planilha tem ${linhasBrutas.length - 1} linhas — o máximo por importação é ${IMPORT_MAX_LINHAS}. Divida o arquivo e importe em partes.`,
    };
  }

  const pega = (celulas: string[], campo: keyof LinhaImportada): string | null => {
    const i = indice[campo];
    if (i === undefined) return null;
    const v = (celulas[i] ?? "").trim();
    return v || null;
  };

  const linhas: LinhaImportada[] = [];
  let semTelefone = 0;
  for (const bruta of linhasBrutas.slice(1)) {
    const celulas = partirLinha(bruta, sep);
    const nome = pega(celulas, "nome");
    if (!nome || nome.length < 2) continue;
    const telefone = pega(celulas, "telefone");
    if (!telefone) semTelefone++;
    linhas.push({
      nome: nome.slice(0, 200),
      telefone,
      categoria: pega(celulas, "categoria"),
      endereco: pega(celulas, "endereco"),
      local: pega(celulas, "local"),
    });
  }

  if (linhas.length === 0) return { erro: "Nenhuma linha com nome de empresa para importar." };
  return { linhas, semTelefone };
}

// Identidade estável da linha: importar o mesmo arquivo duas vezes atualiza
// em vez de duplicar (o mesmo onConflict da busca).
export function idDaLinha(l: LinhaImportada): string {
  const base = `${normalizar(l.nome)}|${(l.telefone ?? "").replace(/\D/g, "")}`;
  let h = 5381;
  for (const ch of base) h = (h * 33) ^ ch.charCodeAt(0);
  return `imp-${(h >>> 0).toString(16)}-${base.length}`;
}
