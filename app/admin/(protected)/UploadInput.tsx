"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass, labelClass, fieldClass } from "./ui";

// Faz upload direto do navegador para o bucket "midias" do Supabase e guarda
// a URL pública num input (name). Isso evita o limite de ~4,5MB das Server
// Actions na Vercel, que estourava com fotos de celular.
export default function UploadInput({
  name,
  label,
  linkLabel = "ou cole um link",
  accept = "image/*",
  folder,
  defaultUrl = "",
  preview = true,
}: {
  name: string;
  label: string;
  linkLabel?: string;
  accept?: string;
  folder: string;
  defaultUrl?: string | null;
  preview?: boolean;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
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
      const path = `${folder}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
      const { error: upErr } = await supabase.storage
        .from("midias")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("midias").getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const isImg = accept.includes("image") && url;

  return (
    <div className={fieldClass}>
      <label className={labelClass}>{label}</label>
      <input type="file" accept={accept} onChange={onFile} disabled={uploading} className={inputClass} />
      {uploading && <span className="text-xs text-gold">Enviando…</span>}
      {error && <span className="text-xs text-coral">{error}</span>}
      <label className={labelClass}>{linkLabel}</label>
      <input
        name={name}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className={inputClass}
      />
      {preview && isImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Prévia"
          className="mt-1 h-20 w-20 rounded-lg object-cover"
        />
      )}
    </div>
  );
}
