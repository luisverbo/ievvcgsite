"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass, labelClass } from "@/components/painel/ui";

// Upload direto do navegador para o bucket "midias" no caminho
// {orgId}/{pasta}/uuid.ext (a policy do storage exige a 1ª pasta = org_id).
// Evita o limite de corpo das Server Actions na Vercel.
export default function UploadInput({
  orgId,
  pasta,
  value,
  onChange,
  label = "Imagem",
  accept = "image/*",
  preview = true,
}: {
  orgId: string;
  pasta: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
  preview?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
      const path = `${orgId}/${pasta}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
      const { error: upErr } = await supabase.storage
        .from("midias")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("midias").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const isImg = accept.includes("image") && value;

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>{label}</label>
      <input type="file" accept={accept} onChange={onFile} disabled={uploading} className={inputClass} />
      {uploading && <span className="text-xs text-brand-2">Enviando…</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ou cole um link https://..."
        className={inputClass}
      />
      {preview && isImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-1 h-16 w-16 rounded-lg object-cover" />
      )}
    </div>
  );
}
