"use client";
import { Input } from "@/components/ui/input";
import { formatCOP, parseCOP } from "@/lib/utils/currency";
import { useState } from "react";

interface Props {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
}

export function CurrencyInput({ value, onChange, disabled, className }: Props) {
  const [display, setDisplay] = useState(
    value > 0 ? formatCOP(value) : "",
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDisplay(e.target.value);
    const num = parseCOP(e.target.value);
    onChange(num);
  }

  function handleBlur() {
    const num = parseCOP(display);
    setDisplay(num > 0 ? formatCOP(num) : "");
    onChange(num);
  }

  return (
    <Input
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={`text-right tabular-nums ${className ?? ""}`}
      placeholder="$ 0"
    />
  );
}
