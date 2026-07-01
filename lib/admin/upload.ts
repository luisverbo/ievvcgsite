import { createClient } from "@/lib/supabase/server";

// Uploads a file to the public "midias" bucket and returns its public URL,
// or null if no file was provided or the upload failed.
export async function uploadToMidias(file: File, folder: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;

  const supabase = await createClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${folder}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error } = await supabase.storage.from("midias").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return null;

  const { data } = supabase.storage.from("midias").getPublicUrl(path);
  return data.publicUrl;
}

// Resolves a media URL from either an uploaded file field or a pasted-link
// field, preferring the upload when both are present.
export async function resolveMediaUrl(
  formData: FormData,
  fileField: string,
  urlField: string,
  folder: string,
) {
  const file = formData.get(fileField);
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadToMidias(file, folder);
    if (uploaded) return uploaded;
  }
  const value = formData.get(urlField);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
