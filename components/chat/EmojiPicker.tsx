"use client";

import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_CATEGORIES = [
  {
    label: "😀",
    name: "Smileys",
    emojis: [
      "😀","😂","😍","🥰","😎","🤔","😢","😡","🤣","😊",
      "😄","😆","🥲","😅","🙂","😏","🤗","😤","🥳","😴",
      "🤯","😱","🤫","🤭","😇","🥺","😫","😛","😝","🤤",
      "😬","🙄","😶","😐","😑","🤐","😷","🤒","🤕","🥴",
    ],
  },
  {
    label: "👍",
    name: "Gestus",
    emojis: [
      "👍","👎","❤️","🔥","💯","🎉","👏","🙌","✨","💪",
      "🤝","👋","🫶","🙏","💫","⭐","💥","👀","💬","🎯",
      "🏆","💰","🎁","💎","🚀","⚡","🌟","💡","🔮","🎪",
    ],
  },
  {
    label: "🐶",
    name: "Dyr",
    emojis: [
      "🐶","🐱","🦁","🐸","🦄","🐺","🦊","🐻","🐼","🐨",
      "🐯","🦋","🐝","🦅","🐬","🦈","🐙","🦑","🌈","☀️",
      "🌙","⭐","🌊","🌸","🍀","🌺","🌻","🍁","🌿","🌵",
    ],
  },
  {
    label: "🍕",
    name: "Mad",
    emojis: [
      "🍕","🍔","🌮","🍜","🍣","🍦","🎂","🍩","🍺","☕",
      "🥤","🍷","🥂","🫖","🍎","🍊","🍋","🍇","🍓","🥑",
      "🎮","💻","📱","🎵","🎸","🎬","📸","🔑","🧩","🎲",
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
          open
            ? "bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
        )}
        title="Vælg emoji"
      >
        <Smile className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 w-72 glass-strong rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden animate-slide-up z-50">
          {/* Category tabs */}
          <div className="flex border-b border-black/[0.06] dark:border-white/[0.06]">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCategory(i)}
                className={cn(
                  "flex-1 py-2.5 text-lg transition-colors duration-150",
                  category === i
                    ? "bg-primary-50 dark:bg-primary-500/10"
                    : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                )}
                title={cat.name}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="p-2 h-44 overflow-y-auto grid grid-cols-8 gap-0.5">
            {EMOJI_CATEGORIES[category].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
                className="w-8 h-8 text-xl flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors duration-100 hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
