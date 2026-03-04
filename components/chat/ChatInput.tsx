"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const content = message.trim();
    if (!content || sending) return;

    setSending(true);
    setMessage("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await onSend(content);
    setSending(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="p-4">
      <div className="flex items-end gap-3 glass rounded-2xl p-2 shadow-lg">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Skriv en besked... (Enter for at sende)"
          disabled={disabled}
          rows={1}
          maxLength={2000}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          style={{ height: "44px" }}
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || sending || disabled}
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
            message.trim() && !sending
              ? "bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/30 hover:-translate-y-0.5 active:translate-y-0"
              : "bg-slate-100 dark:bg-white/[0.06] text-slate-400 cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-2">
        Shift+Enter for ny linje
      </p>
    </div>
  );
}
