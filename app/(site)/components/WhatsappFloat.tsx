export default function WhatsappFloat({ numero }: { numero: string | null }) {
  // Só aparece quando o número está preenchido no painel (Geral → WhatsApp)
  if (!numero) return null;
  const digits = numero.replace(/\D/g, "");

  return (
    <a
      className="wpp-float"
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noreferrer"
      title="Tirar dúvida no WhatsApp"
    >
      💬
    </a>
  );
}
