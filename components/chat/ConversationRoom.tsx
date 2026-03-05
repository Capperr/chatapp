"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, formatTime, cn } from "@/lib/utils";
import { Menu, Pencil, Trash2, Check, X, Users, MessageCircle } from "lucide-react";
import type { ConversationMessageWithProfile, Conversation, Profile } from "@/types";
import { playMessageSound } from "@/lib/sounds";

interface ConversationRoomProps {
  convId: string;
  currentProfile: Profile;
  allUsers: Profile[];
  onToggleSidebar: () => void;
}

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-2">
      <div className="flex-1 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
      <span className="text-xs font-medium text-slate-400 px-2 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.04]">
        {formatDate(date)}
      </span>
      <div className="flex-1 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
    </div>
  );
}

function ConvMessage({
  msg,
  isOwn,
  showAvatar,
  showHeader,
  currentUsername,
}: {
  msg: ConversationMessageWithProfile;
  isOwn: boolean;
  showAvatar: boolean;
  showHeader: boolean;
  currentUsername: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const handleEditSubmit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === msg.content) { setEditing(false); return; }
    const supabase = createClient();
    await supabase
      .from("conversation_messages")
      .update({ content: trimmed, edited_at: new Date().toISOString() })
      .eq("id", msg.id);
    setEditing(false);
  };

  const handleDelete = async () => {
    const supabase = createClient();
    await supabase
      .from("conversation_messages")
      .update({ is_deleted: true })
      .eq("id", msg.id);
  };

  const parts = msg.content.split(/(@\w+)/g);

  return (
    <div className={cn("flex gap-2.5 group message-enter relative", isOwn ? "flex-row-reverse" : "flex-row")}>
      <div className={cn("flex-shrink-0 w-8", !showAvatar && "invisible")}>
        {showAvatar && (
          <Avatar name={msg.profiles.display_name} color={msg.profiles.avatar_color} size="sm" />
        )}
      </div>
      <div className={cn("max-w-[70%] min-w-0", isOwn && "items-end flex flex-col")}>
        {showHeader && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {msg.profiles.display_name}
            </span>
          </div>
        )}
        {msg.is_deleted ? (
          <div className={cn("px-4 py-2.5 rounded-2xl text-sm italic", isOwn ? "rounded-tr-sm" : "rounded-tl-sm", "bg-slate-100 dark:bg-white/[0.04] text-slate-400 border border-black/[0.04] dark:border-white/[0.04]")}>
            🗑 Besked slettet
          </div>
        ) : editing ? (
          <div className="flex flex-col gap-2 min-w-48 w-full">
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
                if (e.key === "Escape") { setEditContent(msg.content); setEditing(false); }
              }}
              className="px-3 py-2 rounded-xl text-sm bg-white dark:bg-white/10 border border-primary-300 dark:border-primary-500/50 focus:outline-none resize-none"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setEditContent(msg.content); setEditing(false); }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06]">
                <X className="w-3 h-3" /> Annuller
              </button>
              <button onClick={handleEditSubmit} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-primary-600 hover:bg-primary-500 text-white">
                <Check className="w-3 h-3" /> Gem
              </button>
            </div>
          </div>
        ) : (
          <div className="relative group/bubble">
            <div className={cn("px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words", isOwn ? "bg-primary-600 text-white rounded-tr-sm" : "bg-white dark:bg-white/[0.07] text-slate-800 dark:text-slate-200 border border-black/[0.06] dark:border-white/[0.06] rounded-tl-sm shadow-sm")}>
              {parts.map((part, i) =>
                part.startsWith("@") ? (
                  <span key={i} className={cn("font-semibold rounded px-0.5", isOwn ? "text-white/90" : "text-primary-600 dark:text-primary-400")}>
                    {part}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
              {msg.edited_at && <span className="text-[10px] opacity-50 ml-2 italic">redigeret</span>}
            </div>
            <div className={cn("absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 text-[10px] text-slate-400 whitespace-nowrap pointer-events-none", isOwn ? "-left-2 -translate-x-full pr-2" : "-right-2 translate-x-full pl-2")}>
              {formatTime(msg.created_at)}
            </div>
            {isOwn && !msg.is_deleted && (
              <div className={cn("absolute -top-3.5 flex gap-1 opacity-0 group-hover/bubble:opacity-100 transition-all", isOwn ? "left-1" : "right-1")}>
                <button onClick={() => setEditing(true)} className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 shadow-md border border-black/[0.08] dark:border-white/[0.12] flex items-center justify-center text-slate-500 hover:text-primary-600 transition-colors">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={handleDelete} className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 shadow-md border border-black/[0.08] dark:border-white/[0.12] flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConversationRoom({
  convId,
  currentProfile,
  allUsers,
  onToggleSidebar,
}: ConversationRoomProps) {
  const [messages, setMessages] = useState<ConversationMessageWithProfile[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  // Fetch conversation details + messages
  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const [{ data: convData }, { data: msgData }] = await Promise.all([
        supabase
          .from("conversations")
          .select("*, conversation_members(*, profiles(*))")
          .eq("id", convId)
          .single(),
        supabase
          .from("conversation_messages")
          .select("*, profiles(*)")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true })
          .limit(150),
      ]);
      if (convData) setConv(convData as unknown as Conversation);
      setMessages((msgData as ConversationMessageWithProfile[]) ?? []);
      setLoading(false);
    };
    setLoading(true);
    fetch();
  }, [convId]);

  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  useEffect(() => {
    if (isAtBottom) scrollToBottom(true);
  }, [messages, isAtBottom, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conv-${convId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${convId}` },
        async (payload) => {
          const { data } = await supabase
            .from("conversation_messages")
            .select("*, profiles(*)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data as ConversationMessageWithProfile];
            });
            if (payload.new.user_id !== currentProfile.id) playMessageSound();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${convId}` },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id
                ? { ...m, content: payload.new.content, edited_at: payload.new.edited_at, is_deleted: payload.new.is_deleted }
                : m
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convId]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    const supabase = createClient();
    await supabase.from("conversation_messages").insert({
      conversation_id: convId,
      user_id: currentProfile.id,
      content: trimmed,
    });
  };

  // Derive header title
  const headerTitle = (() => {
    if (!conv) return "...";
    if (conv.type === "group") return conv.name ?? "Gruppe";
    const other = conv.conversation_members?.find((m) => m.user_id !== currentProfile.id);
    return other?.profiles?.display_name ?? "Direkte besked";
  })();

  const headerSub = (() => {
    if (!conv) return "";
    if (conv.type === "group") {
      const count = conv.conversation_members?.length ?? 0;
      return `${count} medlemmer`;
    }
    const other = conv.conversation_members?.find((m) => m.user_id !== currentProfile.id);
    return other?.profiles?.username ? `@${other.profiles.username}` : "";
  })();

  const headerProfile = conv?.type === "dm"
    ? conv.conversation_members?.find((m) => m.user_id !== currentProfile.id)?.profiles
    : undefined;

  const renderMessages = () =>
    messages.map((msg, index) => {
      const prev = messages[index - 1];
      const isOwn = msg.user_id === currentProfile.id;
      const isNewGroup =
        !prev ||
        prev.user_id !== msg.user_id ||
        new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
      const isNewDay =
        !prev ||
        new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();

      return (
        <div key={msg.id}>
          {isNewDay && <DateDivider date={msg.created_at} />}
          <div className={isNewGroup ? "mt-4" : "mt-0.5"}>
            <ConvMessage
              msg={msg}
              isOwn={isOwn}
              showAvatar={isNewGroup && !isOwn}
              showHeader={isNewGroup && !isOwn}
              currentUsername={currentProfile.username}
            />
          </div>
        </div>
      );
    });

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3.5 glass-strong border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>
          {headerProfile ? (
            <Avatar name={headerProfile.display_name} color={headerProfile.avatar_color} size="sm" />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-primary-500" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
              {headerTitle}
            </h1>
            {headerSub && (
              <p className="text-xs text-slate-400 truncate">{headerSub}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 150);
        }}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 text-sm animate-pulse">Indlæser...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-primary-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{headerTitle}</p>
              <p className="text-sm text-slate-400">Send den første besked</p>
            </div>
          </div>
        ) : (
          renderMessages()
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {!isAtBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-6 w-9 h-9 rounded-full glass shadow-lg border border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center hover:scale-105 transition-transform animate-fade-in z-10"
        >
          ↓
        </button>
      )}

      {/* Simple input */}
      <div className="flex-shrink-0 p-3 glass-strong border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={`Besked til ${headerTitle}...`}
            rows={1}
            className="flex-1 input-base resize-none py-2.5 text-sm"
            maxLength={2000}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
