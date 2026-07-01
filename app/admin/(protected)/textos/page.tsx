import { getConfigEvento } from "@/lib/queries";
import TextosForm from "./TextosForm";

export default async function TextosPage() {
  const config = await getConfigEvento();

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-extrabold">Textos do site</h1>
      <p className="mb-6 text-sm text-cream-dim">
        Edite qualquer texto fixo da página. Campos em branco voltam ao texto padrão. Use
        Enter para quebra de linha nos títulos e nos itens de segurança.
      </p>
      <TextosForm config={config} />
    </div>
  );
}
