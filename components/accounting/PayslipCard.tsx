"use client";

import type { TaxSettings } from "@/types";
import { formatKr, type TaxResult } from "@/lib/tax";
import { TrendingUp } from "lucide-react";

interface PayslipCardProps {
  result: TaxResult;
  settings: TaxSettings;
}

export function PayslipCard({ result, settings }: PayslipCardProps) {
  const rows: { label: string; value: number; sub?: boolean; highlight?: boolean; negative?: boolean }[] = [
    { label: "Total indkørt", value: result.totalIndkoert },
    ...(settings.loenstype === "provisions"
      ? [{ label: `Provision (${settings.provision_sats}%)`, value: result.bruttoIndkomst, sub: true }]
      : []),
    { label: "AM-bidrag (8%)", value: -result.amBidrag, sub: true, negative: true },
    { label: "AM-indkomst", value: result.amIndkomst },
    { label: `Personfradrag (${formatKr(result.personfradrag)}/md)`, value: -result.personfradrag, sub: true, negative: true },
    { label: "Skattepligtig indkomst", value: result.skattepligtigIndkomst },
    { label: `A-skat (${settings.skatteprocent}%)`, value: -result.aSkat, sub: true, negative: true },
    { label: "Estimeret nettoudbetaling", value: result.netUdbetaling, highlight: true },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-700 dark:text-slate-300">Estimeret lønseddel</h2>
          <p className="text-xs text-slate-400">
            {settings.loenstype === "provisions" ? "Provisionslønnet" : "Lønmodtager"} ·
            Skatteprocent {settings.skatteprocent}%
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className={
              row.highlight
                ? "flex items-center justify-between pt-3 mt-2 border-t-2 border-primary-200 dark:border-primary-800"
                : "flex items-center justify-between"
            }
          >
            <span
              className={
                row.highlight
                  ? "font-semibold text-slate-800 dark:text-slate-200"
                  : row.sub
                  ? "text-sm text-slate-500 dark:text-slate-400 pl-4"
                  : "text-sm font-medium text-slate-700 dark:text-slate-300"
              }
            >
              {row.label}
            </span>
            <span
              className={
                row.highlight
                  ? "text-lg font-bold text-primary-600 dark:text-primary-400"
                  : row.negative
                  ? "text-sm text-rose-500 dark:text-rose-400"
                  : "text-sm font-medium text-slate-700 dark:text-slate-300"
              }
            >
              {row.value < 0 ? `−${formatKr(Math.abs(row.value))}` : formatKr(row.value)}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-4">
        Beregningen er estimeret og baseret på personfradrag 49.700 kr/år (2025).
        Kontakt en revisor for præcis beregning.
      </p>
    </div>
  );
}
