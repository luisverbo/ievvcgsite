"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarEbook } from "./actions";
import { inputClass, labelClass, fieldClass } from "@/components/painel/ui";

type Fase =
  | { etapa: "form" }
  | { etapa: "texto" }
  | { etapa: "erro"; mensagem: string };

export default function NovoEbook({ temChave }: { temChave: boolean }) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>({ etapa: "form" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Gera SÓ o texto (barato). As imagens (a parte cara) ficam para depois
    // que você revisar e aprovar o conteúdo no leitor.
    setFase({ etapa: "texto" });
    const res = await criarEbook(formData);
    if (res.error || !res.ebookId) {
      setFase({ etapa: "erro", mensagem: res.error ?? "Erro desconhecido." });
      return;
    }
    router.push(`/app/admin/ebooks/${res.ebookId}`);
  }

  if (!temChave) {
    return (
      <p className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-paper">
        ⚠️ Salve sua chave da OpenAI acima para liberar o gerador.
      </p>
    );
  }

  if (fase.etapa === "texto") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="text-3xl">✍️</span>
        <p className="font-semibold">Escrevendo o conteúdo do seu ebook…</p>
        <p className="text-sm text-paper-dim">
          Títulos, textos e direção de arte. Leva ~30 segundos. Depois você revisa e só então
          aprova a geração das imagens (a parte que custa).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {fase.etapa === "erro" && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {fase.mensagem}
        </p>
      )}
      <div className={fieldClass}>
        <label className={labelClass}>
          Tema do ebook — descreva como se estivesse pedindo para um redator
        </label>
        <textarea
          name="tema"
          required
          rows={3}
          className={inputClass}
          placeholder="Ex: Guia prático de marketing digital para salões de beleza — como atrair clientes pelo Instagram, com dicas acionáveis e exemplos reais"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={fieldClass}>
          <label className={labelClass}>Formato</label>
          <select name="formato" className={inputClass} defaultValue="a4">
            <option value="a4">A4 (vertical clássico)</option>
            <option value="mobile">Mobile (9:16, celular)</option>
            <option value="quadrado">Quadrado (1:1)</option>
          </select>
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Páginas de conteúdo</label>
          <select name="paginas" className={inputClass} defaultValue="8">
            {[4, 6, 8, 10, 12, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n} páginas
              </option>
            ))}
          </select>
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Estilo das imagens</label>
          <select name="estilo" className={inputClass} defaultValue="fotografico">
            <option value="fotografico">Fotográfico</option>
            <option value="ilustracao">Ilustração flat</option>
            <option value="aquarela">Aquarela</option>
            <option value="minimalista">Minimalista</option>
            <option value="3d">3D (estilo Pixar)</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        className="w-fit rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
      >
        ✨ Gerar meu ebook
      </button>
      <p className="text-xs text-paper-dim">
        A geração usa sua conta OpenAI: um ebook de 8 páginas custa por volta de US$0,50 a US$1,50
        (texto + 9 imagens), dependendo do modelo de imagem disponível na sua conta.
      </p>
    </form>
  );
}
