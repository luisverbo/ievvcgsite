import { createClient } from "@/lib/supabase/server";

type OrdemRow = { id: string; ordem: number };

// Swaps the `ordem` value of `id` with its neighbor in the given direction.
// When `filter` is set, the neighbor is only looked for among rows that
// share the same value in that column (used by programação, where reorder
// is scoped to a single day).
export async function moveOrdem(
  table: string,
  id: string,
  direction: "up" | "down",
  filter?: { column: string; value: string },
) {
  const supabase = await createClient();
  let query = supabase.from(table).select("id, ordem").order("ordem", { ascending: true });
  if (filter) query = query.eq(filter.column, filter.value);

  const { data } = await query;
  const rows = (data ?? []) as OrdemRow[];
  const idx = rows.findIndex((r) => r.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= rows.length) return;

  const current = rows[idx];
  const neighbor = rows[swapIdx];

  await supabase.from(table).update({ ordem: neighbor.ordem }).eq("id", current.id);
  await supabase.from(table).update({ ordem: current.ordem }).eq("id", neighbor.id);
}

// Next `ordem` value for a new row (max + 1), scoped to `filter` when set.
export async function nextOrdem(table: string, filter?: { column: string; value: string }) {
  const supabase = await createClient();
  let query = supabase.from(table).select("ordem").order("ordem", { ascending: false }).limit(1);
  if (filter) query = query.eq(filter.column, filter.value);

  const { data } = await query.maybeSingle();
  return ((data as { ordem: number } | null)?.ordem ?? 0) + 1;
}
