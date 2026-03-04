"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils";
import { Users, Wifi, WifiOff } from "lucide-react";
import type { MessageWithProfile, Profile } from "@/types";

interface ChatRoomProps {
  initialMessages: MessageWithProfile[];
  currentProfile: Profile;
}

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-2">
      <div className="flex-1 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 px-2 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.04]">
        {formatDate(date)}
      </span>
      <div className="flex-1 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
    </div>
  );
}

export function ChatRoom({ initialMessages, currentProfile }: ChatRoomProps) {
  const [messages, setMessages] = useState<MessageWithProfile[]>(initialMessages);
  const [onlineCount, setOnlineCount] = useState(1);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const supabase = createClient();

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // Initial scroll
  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  // Scroll to bottom on new messages if user is near bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(true);
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Track scroll position
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 150;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
  };

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("global-chat-room", {
        config: {
          presence: { key: currentProfile.id },
        },
      })
      // Listen for new messages via Postgres changes (WebSocket)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          // Fetch full message with profile
          const { data } = await supabase
            .from("messages")
            .select("*, profiles(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              // Deduplicate
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data as MessageWithProfile];
            });
          }
        }
      )
      // Track online presence
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    // Track own presence
    channel.track({
      user_id: currentProfile.id,
      username: currentProfile.username,
      online_at: new Date().toISOString(),
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentProfile.id, currentProfile.username]);

  const sendMessage = async (content: string) => {
    const { error } = await supabase.from("messages").insert({
      content,
      user_id: currentProfile.id,
    });

    if (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Group messages for avatar/header display
  const renderMessages = () => {
    return messages.map((msg, index) => {
      const prev = messages[index - 1];
      const isOwn = msg.user_id === currentProfile.id;

      const isNewGroup =
        !prev ||
        prev.user_id !== msg.user_id ||
        new Date(msg.created_at).getTime() -
          new Date(prev.created_at).getTime() >
          5 * 60 * 1000;

      const isNewDay =
        !prev ||
        new Date(msg.created_at).toDateString() !==
          new Date(prev.created_at).toDateString();

      return (
        <div key={msg.id}>
          {isNewDay && <DateDivider date={msg.created_at} />}
          <div className={isNewGroup ? "mt-4" : "mt-0.5"}>
            <ChatMessage
              message={msg}
              isOwn={isOwn}
              showAvatar={isNewGroup && !isOwn}
              showHeader={isNewGroup && !isOwn}
            />
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Chat Header */}
      <div className="flex-shrink-0 px-6 py-4 glass-strong border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-slate-100">
              Fælles Chat
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alle kan se og deltage
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Online count */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Users className="inline w-3 h-3 mr-1" />
                {onlineCount} online
              </span>
            </div>

            {/* Connection status */}
            <div
              className={`p-1.5 rounded-full ${connected ? "text-emerald-500" : "text-rose-500"}`}
              title={connected ? "Forbundet" : "Ikke forbundet"}
            >
              {connected ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Ingen beskeder endnu
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Vær den første til at skrive!
              </p>
            </div>
          </div>
        ) : (
          renderMessages()
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 md:bottom-20 right-6 w-10 h-10 rounded-full glass shadow-lg border border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center hover:scale-105 transition-transform animate-fade-in z-10"
        >
          ↓
        </button>
      )}

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput onSend={sendMessage} disabled={!connected} />
      </div>
    </div>
  );
}
