import { getConfigEvento } from "@/lib/queries";
import GeralForm from "./GeralForm";

export default async function GeralPage() {
  const config = await getConfigEvento();

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold">Geral</h1>
      <GeralForm config={config} />
    </div>
  );
}
