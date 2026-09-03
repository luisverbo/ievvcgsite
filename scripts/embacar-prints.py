#!/usr/bin/env python3
"""
Embaça telefones e nomes de pessoas nos prints do painel antes de irem
para a landing.

Uso:
  python3 scripts/embacar-prints.py                # gera public/prospector/*.png
  python3 scripts/embacar-prints.py --conferir     # gera *.conferir.png com as
                                                   # caixas em vermelho, para
                                                   # checar a posição antes

Entrada: os prints originais em  prints/  (na raiz do repo, fora do git):
  prints/funil.png          o Kanban (Novos → Contactados → Responderam → …)
  prints/quem-abordar.png   a tela "Quem abordar (122 disponíveis)"
  prints/leads.png          os cards de lead com nota, etiquetas e telefone

Saída: public/prospector/<mesmo nome>.png

Por que embaçar o que embaçamos:
  - TELEFONE, sempre: a landing é pública e não pode virar lista telefônica.
  - NOME DE PESSOA FÍSICA (a psicóloga, a dentista): é dado pessoal, e a
    página é anúncio nosso — não deles.
  - NOMES nas colunas "Responderam", "Fechados" e "Descartados": dizer em
    público que fulano "virou cliente" ou foi "descartado" afirma uma relação
    que a empresa não autorizou. As colunas "Novos" e "Contactados" ficam:
    são empresas públicas numa lista, sem afirmação sobre elas.

As coordenadas abaixo foram tiradas dos prints enviados em 2/9. Se os
arquivos vierem em outro tamanho, rode com --conferir primeiro e ajuste.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "prints"
SAIDA = RAIZ / "public" / "prospector"

# (x0, y0, x1, y1) em pixels do print original.
REGIOES: dict[str, list[tuple[int, int, int, int]]] = {
    # 923 x 545 — a coluna dos telefones, à direita, sete linhas.
    "quem-abordar.png": [
        (783, 244, 884, 488),
    ],
    # 574 x 532 — telefones no rodapé de cada card, link do Facebook e os
    # nomes das profissionais (pessoa física) nos títulos.
    "leads.png": [
        (76, 10, 205, 32),     # "Psicóloga Lilian Karen Pires"
        (80, 112, 154, 132),   # +55 21 98114-0910
        (76, 148, 200, 170),   # "Tatiana - Psicóloga"
        (80, 234, 154, 254),   # +55 21 99482-4422
        (210, 234, 340, 254),  # www.facebook.com/psicologatati…
        (76, 272, 215, 294),   # "Psicóloga Luana Oliveira"
        (80, 358, 246, 378),   # +55 21 99757-6594 · wa.me/…
        (226, 410, 334, 432),  # "Dra. Carolina Kede"
        (80, 484, 154, 504),   # +55 21 97012-4312
    ],
    # 1226 x 528 — nomes nas colunas Responderam, Fechados e Descartados.
    "funil.png": [
        (524, 136, 716, 154),  # Responderam · card 1
        (524, 218, 716, 236),  # Responderam · card 2
        (752, 136, 946, 154),  # Fechados · card 1
        (752, 218, 946, 236),  # Fechados · card 2
        (982, 136, 1176, 154), # Descartados · card 1
    ],
}


def embacar(im: Image.Image, caixa: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = caixa
    recorte = im.crop((x0, y0, x1, y1))
    # Duas passadas: blur forte + pixelização, para não dar para "desembaçar".
    recorte = recorte.filter(ImageFilter.GaussianBlur(6))
    pequeno = recorte.resize((max(1, (x1 - x0) // 8), max(1, (y1 - y0) // 8)), Image.BILINEAR)
    recorte = pequeno.resize((x1 - x0, y1 - y0), Image.NEAREST)
    im.paste(recorte, (x0, y0))


def main() -> int:
    conferir = "--conferir" in sys.argv
    SAIDA.mkdir(parents=True, exist_ok=True)
    feitos = 0
    for nome, caixas in REGIOES.items():
        origem = ENTRADA / nome
        if not origem.exists():
            print(f"— {nome}: não encontrado em prints/, pulei")
            continue
        im = Image.open(origem).convert("RGB")
        print(f"✓ {nome}: {im.size[0]}x{im.size[1]}, {len(caixas)} áreas")
        if conferir:
            d = ImageDraw.Draw(im)
            for c in caixas:
                d.rectangle(c, outline=(255, 0, 0), width=2)
            destino = SAIDA / nome.replace(".png", ".conferir.png")
        else:
            for c in caixas:
                embacar(im, c)
            destino = SAIDA / nome
        im.save(destino, optimize=True)
        print(f"  → {destino.relative_to(RAIZ)}")
        feitos += 1
    if feitos == 0:
        print("\nNenhum print encontrado. Coloque os arquivos em prints/ com os nomes:")
        for nome in REGIOES:
            print(f"  prints/{nome}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
