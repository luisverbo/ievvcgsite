/*
 * Os porteiros dos arquivos da página, testados sem navegador e sem banco.
 *
 * Duas linhas aqui valem por uma tarde de depuração: a que recusa extensão
 * fora da lista (bucket público não é lugar de arquivo arbitrário) e a que
 * neutraliza "../.." no nome — sem ela, um nome forjado escreveria fora da
 * pasta da própria conta.
 *
 *     node --experimental-strip-types lib/ia/__testes__/midias.mts
 */
import { classificarArquivo, nomeNoStorage, emMb, blocoParaIA } from "../midias.ts";

let falhas = 0;
const ok = (nome: string, cond: boolean, extra = "") => {
  if (!cond) falhas++;
  console.log(`${cond ? "✅" : "❌"} ${nome}${extra ? ` ${extra}` : ""}`);
};

ok("mp4 é vídeo", classificarArquivo("topo.mp4")?.tipo === "video");
ok("extensão maiúscula também vale", classificarArquivo("Depoimento.MOV")?.tipo === "video");
ok("mp3 é áudio", classificarArquivo("trilha.mp3")?.tipo === "audio");
ok("pdf é pdf", classificarArquivo("catalogo.pdf")?.tipo === "pdf");
ok("executável recusado", classificarArquivo("instalador.exe") === null);
ok("sem extensão recusado", classificarArquivo("arquivo") === null);

const n = nomeNoStorage("Vídeo do Topo (final).mp4");
ok("nome sem acento nem espaço", !/[À-ÿ\s]/.test(n), n);
ok("extensão preservada", n.endsWith(".mp4"));
ok("travessia de pasta neutralizada", !nomeNoStorage("../../etc/passwd").includes("/"));
ok("dois envios do mesmo nome não colidem", nomeNoStorage("a.mp4") !== "a.mp4");

ok("tamanho em MB", emMb(1_572_864) === "1,5 MB");

const bloco = blocoParaIA([
  { id: "1", nome: "topo.mp4", caminho: "c", url: "https://x/topo.mp4", tipo: "video", bytes: 1_048_576, created_at: "" },
]);
ok("o bloco da IA traz a URL real", bloco.includes("https://x/topo.mp4"));
ok("o bloco ensina a tag de vídeo", bloco.includes("<video"));
ok("sem arquivo, bloco vazio", blocoParaIA([]) === "");

console.log(falhas === 0 ? "\nTUDO PASSOU" : `\n${falhas} FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);
