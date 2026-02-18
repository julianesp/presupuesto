export function rubroLevel(codigo: string): number {
  return codigo.split(".").length - 1;
}

export function rubroIndentClass(codigo: string): string {
  const level = rubroLevel(codigo);
  const padMap: Record<number, string> = {
    0: "pl-0",
    1: "pl-4",
    2: "pl-8",
    3: "pl-12",
    4: "pl-16",
  };
  return padMap[level] || "pl-16";
}
