"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative flex items-center gap-2 rounded-xl transition-all duration-200",
        compact
          ? "p-2.5 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
          : "px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-white/[0.06]",
        className
      )}
      aria-label="Skift tema"
    >
      <div className="relative w-5 h-5">
        <Sun
          className={cn(
            "absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-300",
            isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 w-5 h-5 text-primary-400 transition-all duration-300",
            isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
          )}
        />
      </div>
      {!compact && (
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {isDark ? "Mørk tilstand" : "Lys tilstand"}
        </span>
      )}
    </button>
  );
}
