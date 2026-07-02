"use client";

import { inputClass } from "../ui";

const PRESETS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "14", label: "Últimos 14 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

export default function PeriodoForm({
  periodo,
  de,
  ate,
}: {
  periodo: string;
  de?: string;
  ate?: string;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm text-cream-dim">
        Período
        <select name="periodo" defaultValue={de || ate ? "" : periodo} className={inputClass}>
          <option value="">Personalizado (datas)</option>
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-cream-dim">
        De
        <input type="date" name="de" defaultValue={de ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-cream-dim">
        Até
        <input type="date" name="ate" defaultValue={ate ?? ""} className={inputClass} />
      </label>
      <button
        type="submit"
        className="rounded-full bg-coral px-5 py-2.5 font-bold text-cream"
      >
        Aplicar
      </button>
      <a href="/admin/metricas" className="self-center text-sm text-cream-dim hover:underline">
        Limpar
      </a>
    </form>
  );
}
