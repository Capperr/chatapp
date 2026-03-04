"use client";

import { useState, useRef, KeyboardEvent, useEffect, useCallback } from "react";
import { Send, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiPicker } from "./EmojiPicker";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/types";

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  currentProfile: Profile;
  disabled?: boolean;
}

function isMuted(profile: Profile): boolean {
  if (profile.is_banned) return true;
  if (!profile.muted_until) return false;
  return new Date(profile.muted_until) > new Date();
}

function getMuteMessage(profile: Profile): string {
  if (profile.is_banned) return "Du er permanent udelukket fra chatten.";
  if (profile.muted_until) {
    const until = new Date(profile.muted_until);
    return `Du er muted indtil ${until.toLocaleTimeString("da-DK", {
      hour: "2-digit",
      minute: "2-digit",
    })}.`;
  }
  return "";
}

export function ChatInput({ onSend, currentProfile, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  const muted = isMuted(currentProfile);

  // Fetch mention suggestions when @query changes
  useEffect(() => {
    if (mentionQuery === null) {
      setMentionSuggestions([]);
      return;
    }
    const run = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_color,role,muted_until,is_banned,bio,created_at,updated_at")
        .ilike("username", `${mentionQuery}%`)
        .neq("id", currentProfile.id)
        .limit(5);
      setMentionSuggestions((data as Profile[]) ?? []);
      setSelectedSuggestion(0);
    };
    run();
  }, [mentionQuery, currentProfile.id, supabase]);

  const detectMention = useCallback((text: string, cursorPos: number) => {
    const before = text.slice(0, cursorPos);
    const match = before.match(/@(\w*)$/);
    if (match) return { query: match[1], start: cursorPos - match[0].length };
    return null;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    const cursor = e.target.selectionStart ?? val.length;
    const mention = detectMention(val, cursor);
    if (mention) {
      setMentionQuery(mention.query);
      setMentionStart(mention.start);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }

    // Auto-resize textarea
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  };

  const insertMention = (profile: Profile) => {
    const cursor = textareaRef.current?.selectionStart ?? message.length;
    const before = message.slice(0, mentionStart);
    const after = message.slice(cursor);
    const newMsg = `${before}@${profile.username} ${after}`;
    setMessage(newMsg);
    setMentionQuery(null);
    setMentionStart(-1);
    setMentionSuggestions([]);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) { setMessage((m) => m + emoji); return; }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const newMsg = message.slice(0, start) + emoji + message.slice(end);
    setMessage(newMsg);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleSend = async () => {
    const content = message.trim();
    if (!content || sending || muted || disabled) return;
    setSending(true);
    setMessage("");
    setMentionQuery(null);
    if (textareaRef.current) textareaRef.current.style.height = "44px";
    await onSend(content);
    setSending(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion((s) => Math.min(s + 1, mentionSuggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion((s) => Math.max(s - 1, 0));
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        insertMention(mentionSuggestions[selectedSuggestion]);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        setMentionSuggestions([]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (muted) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
          <MicOff className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {getMuteMessage(currentProfile)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 relative">
      {/* @Mention suggestions */}
      {mentionSuggestions.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 glass-strong rounded-xl shadow-xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden animate-slide-up z-20">
          {mentionSuggestions.map((profile, i) => (
            <button
              key={profile.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(profile); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                i === selectedSuggestion
                  ? "bg-primary-50 dark:bg-primary-500/10"
                  : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
              )}
            >
              <Avatar name={profile.display_name} color={profile.avatar_color} size="sm" />
              <div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {profile.display_name}
                </span>
                <span className="text-xs text-slate-400 ml-2">@{profile.username}</span>
              </div>
            </button>
          ))}
          <p className="px-4 py-1.5 text-[10px] text-slate-400 border-t border-black/[0.04] dark:border-white/[0.04]">
            ↑↓ navigér · Tab/Enter for at vælge · Esc for at lukke
          </p>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 glass rounded-2xl p-2 shadow-lg">
        <EmojiPicker onSelect={insertEmoji} />
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Skriv en besked... @ for at nævne nogen"
          rows={1}
          maxLength={2000}
          className="flex-1 bg-transparent px-2 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          style={{ height: "44px" }}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
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
        Shift+Enter for ny linje · @ for at nævne
      </p>
    </div>
  );
}
