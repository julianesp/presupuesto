export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseCOP(str: string): number {
  const cleaned = str.replace(/[^0-9,-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}
