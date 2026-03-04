"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Period,
  getCurrentPeriod,
  getPreviousPeriod,
  getNextPeriod,
} from "@/lib/accounting";
import { beregnLoen, formatKr } from "@/lib/tax";
import type { AccountingShift, TaxSettings } from "@/types";
import { ShiftModal } from "./ShiftModal";
import { PayslipCard } from "./PayslipCard";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Printer,
  Pencil,
  Trash2,
  Settings2,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountingClientProps {
  userId: string;
  displayName: string;
}

const DEFAULT_SETTINGS: TaxSettings = {
  user_id: "",
  loenstype: "loenmodtager",
  skatteprocent: 37,
  provision_sats: 50,
  updated_at: "",
};

export function AccountingClient({ userId, displayName }: AccountingClientProps) {
  const [period, setPeriod] = useState<Period>(getCurrentPeriod());
  const [shifts, setShifts] = useState<AccountingShift[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(DEFAULT_SETTINGS);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<AccountingShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaxPanel, setShowTaxPanel] = useState(false);

  const currentPeriod = getCurrentPeriod();
  const isAtCurrentPeriod =
    period.year === currentPeriod.year && period.month === currentPeriod.month;

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    const [{ data: shiftsData }, { data: settingsData }] = await Promise.all([
      supabase
        .from("accounting_shifts")
        .select("*")
        .eq("user_id", userId)
        .gte("shift_date", period.startDate)
        .lte("shift_date", period.endDate)
        .order("shift_date", { ascending: true }),
      supabase.from("tax_settings").select("*").eq("user_id", userId).single(),
    ]);

    setShifts((shiftsData as AccountingShift[]) ?? []);
    if (settingsData) setTaxSettings(settingsData as TaxSettings);
    setLoading(false);
  }, [period, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Slet denne vagt?")) return;
    const supabase = createClient();
    await supabase.from("accounting_shifts").delete().eq("id", id);
    setShifts((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSaveTaxSettings = async (updates: Partial<TaxSettings>) => {
    const supabase = createClient();
    const updated: TaxSettings = {
      ...taxSettings,
      ...updates,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("tax_settings").upsert(updated);
    setTaxSettings(updated);
  };

  const handleShiftSaved = (shift: AccountingShift, isNew: boolean) => {
    if (isNew) {
      setShifts((prev) =>
        [...prev, shift].sort((a, b) => a.shift_date.localeCompare(b.shift_date))
      );
    } else {
      setShifts((prev) => prev.map((s) => (s.id === shift.id ? shift : s)));
    }
  };

  const handlePrint = () => window.print();

  const totals = shifts.reduce(
    (acc, s) => ({
      konto: acc.konto + s.konto,
      kreditkort: acc.kreditkort + s.kreditkort,
      diverse: acc.diverse + s.diverse,
      drikkepenge: acc.drikkepenge + s.drikkepenge,
      kontant: acc.kontant + s.kontant,
      total_indkoert: acc.total_indkoert + s.total_indkoert,
    }),
    { konto: 0, kreditkort: 0, diverse: 0, drikkepenge: 0, kontant: 0, total_indkoert: 0 }
  );

  const taxResult = beregnLoen({
    totalIndkoert: totals.total_indkoert,
    loenstype: taxSettings.loenstype,
    skatteprocent: taxSettings.skatteprocent,
    provisionSats: taxSettings.provision_sats,
  });

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
    });

  return (
    <>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Afregning
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {displayName}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTaxPanel(!showTaxPanel)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                showTaxPanel
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.1]"
              )}
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Skatteindstillinger</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-all"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Udskriv / PDF</span>
            </button>
          </div>
        </div>

        {/* Tax settings panel */}
        {showTaxPanel && (
          <TaxSettingsPanel
            settings={taxSettings}
            onSave={handleSaveTaxSettings}
            onClose={() => setShowTaxPanel(false)}
          />
        )}

        {/* Period navigation */}
        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={() => setPeriod(getPreviousPeriod(period))}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1 text-center">
            <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
              {period.label}
            </p>
          </div>
          <button
            onClick={() => setPeriod(getNextPeriod(period))}
            disabled={isAtCurrentPeriod}
            className={cn(
              "p-2 rounded-xl transition-all",
              isAtCurrentPeriod
                ? "opacity-30 cursor-not-allowed"
                : "bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1]"
            )}
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* === PRINTABLE AREA === */}
        <div id="print-area">
          {/* Print-only header */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold text-black">
              Afregning – {displayName}
            </h1>
            <p className="text-gray-600">Periode: {period.label}</p>
          </div>

          {/* Shifts table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-black/[0.06] dark:border-white/[0.06]">
              <h2 className="font-semibold text-slate-700 dark:text-slate-300">
                Vagter ({shifts.length})
              </h2>
              <button
                onClick={() => {
                  setEditingShift(null);
                  setShowModal(true);
                }}
                className="btn-primary flex items-center gap-1.5 text-sm py-2 px-4 print:hidden"
              >
                <Plus className="w-4 h-4" />
                Tilføj vagt
              </button>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-400">Indlæser...</div>
            ) : shifts.length === 0 ? (
              <div className="p-10 text-center text-slate-400 print:hidden">
                <Calculator className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Ingen vagter i denne periode</p>
                <p className="text-sm mt-1">Klik på &quot;Tilføj vagt&quot; for at komme i gang</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-black/[0.06] dark:border-white/[0.06]">
                      <th className="text-left px-4 py-3 font-medium text-slate-500">Dato</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-500">Vagt #</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-500">Konto</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-500">Kreditkort</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-500">Diverse</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-500">Drikkepenge</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-500">Kontant</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-500">Total indkørt</th>
                      <th className="px-2 py-3 print:hidden" />
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((shift) => (
                      <tr
                        key={shift.id}
                        className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {fmtDate(shift.shift_date)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono">
                          {shift.vagt_nummer || "–"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatKr(shift.konto)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatKr(shift.kreditkort)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatKr(shift.diverse)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatKr(shift.drikkepenge)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatKr(shift.kontant)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                          {formatKr(shift.total_indkoert)}
                        </td>
                        <td className="px-2 py-3 print:hidden">
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingShift(shift);
                                setShowModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(shift.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {shifts.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-white/[0.04] border-t-2 border-slate-200 dark:border-white/[0.1] font-semibold">
                        <td colSpan={2} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          Total ({shifts.length} vagter)
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatKr(totals.konto)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatKr(totals.kreditkort)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatKr(totals.diverse)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatKr(totals.drikkepenge)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatKr(totals.kontant)}
                        </td>
                        <td className="px-4 py-3 text-right text-primary-600 dark:text-primary-400 text-base">
                          {formatKr(totals.total_indkoert)}
                        </td>
                        <td className="print:hidden" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* Payslip */}
          {shifts.length > 0 && <PayslipCard result={taxResult} settings={taxSettings} />}
        </div>
      </div>

      {showModal && (
        <ShiftModal
          userId={userId}
          shift={editingShift}
          period={period}
          onClose={() => setShowModal(false)}
          onSaved={handleShiftSaved}
        />
      )}
    </>
  );
}

// Inline sub-component for tax settings panel
function TaxSettingsPanel({
  settings,
  onSave,
  onClose,
}: {
  settings: TaxSettings;
  onSave: (s: Partial<TaxSettings>) => Promise<void>;
  onClose: () => void;
}) {
  const [loenstype, setLoenstype] = useState(settings.loenstype);
  const [skatteprocent, setSkatteprocent] = useState(String(settings.skatteprocent));
  const [provisionSats, setProvisionSats] = useState(String(settings.provision_sats));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      loenstype: loenstype as "loenmodtager" | "provisions",
      skatteprocent: parseFloat(skatteprocent) || 37,
      provision_sats: parseFloat(provisionSats) || 50,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="card p-5 animate-slide-up print:hidden">
      <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">
        Skatteindstillinger
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Løntype
          </label>
          <select
            value={loenstype}
            onChange={(e) => setLoenstype(e.target.value as "loenmodtager" | "provisions")}
            className="input-base py-2.5 text-sm"
          >
            <option value="loenmodtager">Lønmodtager</option>
            <option value="provisions">Provisionslønnet</option>
          </select>
        </div>
        {loenstype === "provisions" && (
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Provision (%)
            </label>
            <input
              type="number"
              value={provisionSats}
              onChange={(e) => setProvisionSats(e.target.value)}
              min={1}
              max={100}
              step={0.5}
              className="input-base py-2.5 text-sm"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Skatteprocent (%)
          </label>
          <input
            type="number"
            value={skatteprocent}
            onChange={(e) => setSkatteprocent(e.target.value)}
            min={1}
            max={60}
            step={0.1}
            className="input-base py-2.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary py-2.5 text-sm"
        >
          {saving ? "Gemmer..." : "Gem indstillinger"}
        </button>
        <button onClick={onClose} className="btn-secondary py-2.5 text-sm">
          Annuller
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-3">
        AM-bidrag: 8% · Personfradrag 2025: 49.700 kr/år · Beregning er estimeret og vejledende
      </p>
    </div>
  );
}
