import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Uploads de mídia vão direto do navegador para o Supabase Storage
  // (ver app/admin/(protected)/UploadInput.tsx), então não passam pelas
  // Server Actions e não esbarram no limite de corpo da Vercel.
};

export default nextConfig;
