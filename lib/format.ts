const TZ = "America/Sao_Paulo";

export function formatHeroDates(dataEvento: string) {
  const start = new Date(dataEvento);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const day1 = start.toLocaleDateString("pt-BR", { day: "numeric", timeZone: TZ });
  const day2 = end.toLocaleDateString("pt-BR", { day: "numeric", timeZone: TZ });
  const month = start.toLocaleDateString("pt-BR", { month: "long", timeZone: TZ });

  return { day1, day2, month };
}

export function formatPrice(preco: number) {
  return preco.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

// Formats an ISO timestamp for a <input type="datetime-local">, using the
// event's timezone so the admin sees the same wall-clock time they set.
export function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
