const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function mesNombre(mes: number): string {
  return MESES[mes - 1] || `Mes ${mes}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
}

export const MESES_LIST = MESES.map((nombre, i) => ({
  value: String(i + 1),
  label: nombre,
}));
