"use client";

import { useState } from "react";
import { X, MicOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

const DURATIONS = [
  { label: "5 minutter", minutes: 5 },
  { label: "30 minutter", minutes: 30 },
  { label: "1 time", minutes: 60 },
  { label: "6 timer", minutes: 360 },
  { label: "24 timer", minutes: 1440 },
  { label: "7 dage", minutes: 10080 },
  { label: "Permanent", minutes: -1 },
];

interface MuteDialogProps {
  user: Profile;
  onConfirm: (userId: string, minutes: number) => Promise<void>;
  onClose: () => void;
}

export function MuteDialog({ user, onConfirm, onClose }: MuteDialogProps) {
  const [selected, setSelected] = useState<number>(30);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(user.id, selected);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm card p-6 animate-slide-up shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
            <MicOff className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Mute bruger</h3>
            <p className="text-sm text-slate-500">
              @{user.username} · {user.display_name}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Vælg varighed:
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {DURATIONS.map((d) => (
            <button
              key={d.minutes}
              onClick={() => setSelected(d.minutes)}
              className={cn(
                "px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                selected === d.minutes
                  ? d.minutes === -1
                    ? "bg-rose-600 text-white border-rose-600 shadow-lg"
                    : "bg-primary-600 text-white border-primary-600 shadow-lg"
                  : "bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-black/[0.06] dark:border-white/[0.08] hover:border-primary-300"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5">
            Annuller
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl font-semibold text-white transition-all",
              selected === -1
                ? "bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-500/25"
                : "bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/25",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? "Muter..." : selected === -1 ? "Ban permanent" : "Mute"}
          </button>
        </div>
      </div>
    </div>
  );
}
