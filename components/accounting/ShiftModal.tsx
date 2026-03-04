"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AccountingShift } from "@/types";
import type { Period } from "@/lib/accounting";
import { X } from "lucide-react";

interface ShiftModalProps {
  userId: string;
  shift: AccountingShift | null;
  period: Period;
  onClose: () => void;
  onSaved: (shift: AccountingShift, isNew: boolean) => void;
}

const EMPTY = { vagt_nummer: "", konto: "", kreditkort: "", diverse: "", drikkepenge: "", kontant: "", total_indkoert: "", notes: "" };

export function ShiftModal({ userId, shift, period, onClose, onSaved }: ShiftModalProps) {
  const isNew = !shift;
  const [date, setDate] = useState(shift?.shift_date ?? period.startDate);
  const [form, setForm] = useState(
    shift
      ? {
          vagt_nummer: shift.vagt_nummer,
          konto: String(shift.konto),
          kreditkort: String(shift.kreditkort),
          diverse: String(shift.diverse),
          drikkepenge: String(shift.drikkepenge),
          kontant: String(shift.kontant),
          total_indkoert: String(shift.total_indkoert),
          notes: shift.notes ?? "",
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const num = (v: string) => parseFloat(v) || 0;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const supabase = createClient();

    const payload = {
      user_id: userId,
      shift_date: date,
      vagt_nummer: form.vagt_nummer.trim(),
      konto: num(form.konto),
      kreditkort: num(form.kreditkort),
      diverse: num(form.diverse),
      drikkepenge: num(form.drikkepenge),
      kontant: num(form.kontant),
      total_indkoert: num(form.total_indkoert),
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (isNew) {
      const { data, error: err } = await supabase
        .from("accounting_shifts")
        .insert(payload)
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      onSaved(data as AccountingShift, true);
    } else {
      const { data, error: err } = await supabase
        .from("accounting_shifts")
        .update(payload)
        .eq("id", shift!.id)
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      onSaved(data as AccountingShift, false);
    }

    onClose();
  };

  const fields: { label: string; key: keyof typeof EMPTY; placeholder?: string }[] = [
    { label: "Konto (kr)", key: "konto", placeholder: "0,00" },
    { label: "Kreditkort (kr)", key: "kreditkort", placeholder: "0,00" },
    { label: "Diverse (kr)", key: "diverse", placeholder: "0,00" },
    { label: "Drikkepenge (kr)", key: "drikkepenge", placeholder: "0,00" },
    { label: "Kontant (kr)", key: "kontant", placeholder: "0,00" },
    { label: "Total indkørt (kr)", key: "total_indkoert", placeholder: "0,00" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-strong rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">
            {isNew ? "Tilføj vagt" : "Rediger vagt"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Date and Vagt nr */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Dato</label>
              <input
                type="date"
                value={date}
                min={period.startDate}
                max={period.endDate}
                onChange={(e) => setDate(e.target.value)}
                required
                className="input-base py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Vagt nummer</label>
              <input
                type="text"
                value={form.vagt_nummer}
                onChange={set("vagt_nummer")}
                placeholder="fx. 1234"
                className="input-base py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Numeric fields */}
          <div className="grid grid-cols-2 gap-3">
            {fields.map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>
                <input
                  type="number"
                  value={form[key]}
                  onChange={set(key)}
                  placeholder={placeholder}
                  min={0}
                  step={0.01}
                  className="input-base py-2.5 text-sm"
                />
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Noter (valgfrit)</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              placeholder="Evt. kommentarer til vagten..."
              className="input-base py-2.5 text-sm resize-none"
            />
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary py-2.5 text-sm">
              {saving ? "Gemmer..." : isNew ? "Tilføj vagt" : "Gem ændringer"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary py-2.5 text-sm">
              Annuller
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
