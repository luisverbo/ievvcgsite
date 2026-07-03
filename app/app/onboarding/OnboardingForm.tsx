"use client";

import { useActionState, useState } from "react";
import { criarOrganizacao, type OnboardingState } from "./actions";
import { slugify } from "@/lib/format";
import { inputClass, labelClass, fieldClass, btnPrimary } from "@/components/painel/ui";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seudominio.com.br";

const NICHOS = [
  { id: "evento", icone: "🎭", nome: "Evento", descricao: "Festa, show ou congresso" },
  { id: "curso", icone: "🚀", nome: "Curso Digital", descricao: "Infoproduto ou mentoria" },
  { id: "servico", icone: "🏪", nome: "Serviço Local", descricao: "Salão, clínica, oficina…" },
  { id: "portfolio", icone: "👤", nome: "Portfólio", descricao: "Profissional liberal" },
  { id: "restaurante", icone: "🍽️", nome: "Restaurante", descricao: "Delivery ou cardápio" },
  { id: "imovel", icone: "🏠", nome: "Imobiliária", descricao: "Imóveis ou corretor" },
  { id: "leads", icone: "📧", nome: "Captura de Leads", descricao: "Isca digital ou lista" },
  { id: "produto", icone: "📦", nome: "Produto Físico", descricao: "Loja ou e-commerce" },
  { id: "bio", icone: "🔗", nome: "Link-in-Bio", descricao: "Para redes sociais" },
  { id: "webinar", icone: "📹", nome: "Webinar / VSL", descricao: "Aula ao vivo ou vídeo" },
];

export default function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    criarOrganizacao,
    undefined,
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [nicho, setNicho] = useState("");
  const [slug, setSlug] = useState("");

  if (step === 1) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-paper-dim">Passo 1 de 2 — O que você quer criar?</p>
        <div className="grid grid-cols-2 gap-2">
          {NICHOS.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                setNicho(n.id);
                setStep(2);
              }}
              className={`flex items-start gap-2 rounded-lg border p-3 text-left transition ${
                nicho === n.id
                  ? "border-brand-2 bg-brand/10"
                  : "border-white/10 hover:border-brand-2"
              }`}
            >
              <span className="text-xl">{n.icone}</span>
              <span>
                <span className="block text-sm font-semibold">{n.nome}</span>
                <span className="block text-xs text-paper-dim">{n.descricao}</span>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setNicho("");
            setStep(2);
          }}
          className="text-sm text-paper-dim hover:text-paper"
        >
          Pular e começar em branco →
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="nicho" value={nicho} />
      <button
        type="button"
        onClick={() => setStep(1)}
        className="mb-2 text-left text-sm text-paper-dim hover:text-paper"
      >
        ← Voltar
      </button>
      <p className="text-sm text-paper-dim">Passo 2 de 2 — Só mais alguns dados</p>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="nome_org">
          Nome da sua empresa ou projeto
        </label>
        <input id="nome_org" name="nome_org" required className={inputClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="nome_site">
          Nome do seu primeiro site
        </label>
        <input
          id="nome_site"
          name="nome_site"
          required
          className={inputClass}
          onChange={(e) => setSlug(slugify(e.target.value))}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="slug">
          Endereço do site
        </label>
        <div className="flex items-center gap-2">
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
            minLength={3}
            className={`${inputClass} flex-1`}
          />
          <span className="text-sm text-paper-dim">.{ROOT}</span>
        </div>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={pending} className={`mt-2 w-fit ${btnPrimary}`}>
        {pending ? "Criando…" : "Criar meu site"}
      </button>
    </form>
  );
}
