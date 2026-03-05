"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled, playMessageSound, playNotificationSound } from "@/lib/sounds";

export function SoundSettings() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    if (next) playMessageSound();
  };

  const testNotif = () => {
    if (enabled) playNotificationSound();
  };

  return (
    <div className="card p-6 space-y-4">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Lydindstillinger</h2>

      <div className="flex items-center justify-between py-2 border-b border-black/[0.04] dark:border-white/[0.04]">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Chat lyde</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Afspil lyd ved nye beskeder og notifikationer
          </p>
        </div>
        <button
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-primary-600" : "bg-slate-200 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={!enabled}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40"
        >
          <Volume2 className="w-4 h-4 text-primary-500" />
          Test besked lyd
        </button>
        <button
          onClick={testNotif}
          disabled={!enabled}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40"
        >
          <VolumeX className="w-4 h-4 text-violet-500" />
          Test notifikation lyd
        </button>
      </div>
    </div>
  );
}
