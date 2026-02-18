"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { rubroLevel, rubroIndentClass } from "@/lib/utils/rubro-level";
import { PencilIcon, Trash2Icon } from "lucide-react";
import type { RubroGasto } from "@/lib/types/rubros";

interface Props {
  rubros: RubroGasto[];
  onEdit: (r: RubroGasto) => void;
  onDelete: (r: RubroGasto) => void;
}

export function RubrosGastosTree({ rubros, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-xs uppercase tracking-wide text-slate-700 w-32">Código</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-700">Cuenta</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Aprop. Inicial</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Adiciones</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Reducciones</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Créditos</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Contracréditos</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Aprop. Definitiva</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Saldo Disp.</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rubros.map((r) => {
            const level = rubroLevel(r.codigo);
            const isLeaf = r.es_hoja === 1;
            return (
              <TableRow
                key={r.codigo}
                className={!isLeaf ? "bg-slate-50" : ""}
              >
                <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                <TableCell>
                  <span className={`${rubroIndentClass(r.codigo)} ${!isLeaf ? "font-semibold" : ""}`}>
                    {r.cuenta}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <CurrencyDisplay value={r.apropiacion_inicial} />
                </TableCell>
                <TableCell className="text-right">
                  <CurrencyDisplay value={r.adiciones} />
                </TableCell>
                <TableCell className="text-right">
                  <CurrencyDisplay value={r.reducciones} />
                </TableCell>
                <TableCell className="text-right">
                  <CurrencyDisplay value={r.creditos} />
                </TableCell>
                <TableCell className="text-right">
                  <CurrencyDisplay value={r.contracreditos} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  <CurrencyDisplay value={r.apropiacion_definitiva} />
                </TableCell>
                <TableCell className="text-right">
                  <CurrencyDisplay value={r.saldo_disponible ?? 0} />
                </TableCell>
                <TableCell>
                  {isLeaf && (
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(r)}
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => onDelete(r)}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
