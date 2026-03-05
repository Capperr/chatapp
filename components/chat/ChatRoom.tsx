"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { formatDate } from "@/lib/utils";
import { Users, Wifi, WifiOff, Menu, Trash2, Hash, Boxes } from "lucide-react";
import type { MessageWithProfile, Profile } from "@/types";
import { UserProfileModal } from "./UserProfileModal";
import { VirtualRoom } from "./VirtualRoom";
import { playMessageSound } from "@/lib/sounds";

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  roomDescription: string;
  currentProfile: Profile;
  mobileUserIds?: Set<string>;
  onToggleSidebar: () => void;
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

export function ChatRoom({
  roomId,
  roomName,
  roomDescription,
  currentProfile,
  mobileUserIds,
  onToggleSidebar,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(1);
  const [connected, setConnected] = useState(false);
  const [modalProfile, setModalProfile] = useState<Profile | null>(null);
  const [showVirtual, setShowVirtual] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const isAdmin = currentProfile.role === "admin";

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("messages")
        .select("*, profiles(*)")
        .eq("room_id", roomId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(150);
      setMessages((data as MessageWithProfile[]) ?? []);
      setLoading(false);
    };
    setLoading(true);
    fetch();
  }, [roomId]);

  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  useEffect(() => {
    if (isAtBottom) scrollToBottom(true);
  }, [messages, isAtBottom, scrollToBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 150);
  };

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room-${roomId}`, {
        config: { presence: { key: currentProfile.id } },
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const { data } = await supabase
            .from("messages")
            .select("*, profiles(*)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data as MessageWithProfile];
            });
            if (payload.new.user_id !== currentProfile.id) playMessageSound();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.new.is_deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.new.id));
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.new.id
                  ? { ...m, content: payload.new.content, edited_at: payload.new.edited_at }
                  : m
              )
            );
          }
        }
      )
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    channel.track({ user_id: currentProfile.id, username: currentProfile.username });

    return () => { supabase.removeChannel(channel); };
  }, [roomId, currentProfile.id, currentProfile.username]);

  const sendMessage = async (content: string) => {
    const supabase = createClient();
    await supabase.from("messages").insert({
      content,
      user_id: currentProfile.id,
      room_id: roomId,
    });
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("messages").update({ is_deleted: true }).eq("id", id);
  };

  const handleEdit = async (id: string, content: string) => {
    const supabase = createClient();
    await supabase
      .from("messages")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", id);
  };

  const handleClearChat = async () => {
    if (!confirm(`Tøm hele chatten i "${roomName}"? Kan ikke fortrydes.`)) return;
    const supabase = createClient();
    await supabase
      .from("messages")
      .update({ is_deleted: true })
      .eq("room_id", roomId)
      .eq("is_deleted", false);
    setMessages([]);
  };

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
            <ChatMessage
              message={msg}
              isOwn={isOwn}
              showAvatar={isNewGroup && !isOwn}
              showHeader={isNewGroup && !isOwn}
              currentUsername={currentProfile.username}
              isAdmin={isAdmin}
              isMobile={!isOwn && mobileUserIds?.has(msg.user_id)}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onOpenProfile={setModalProfile}
            />
          </div>
        </div>
      );
    });

  return (
    <div className="flex flex-col h-full relative">
      {showVirtual && (
        <VirtualRoom
          roomId={roomId}
          roomName={roomName}
          currentProfile={currentProfile}
          onClose={() => setShowVirtual(false)}
        />
      )}
      {modalProfile && (
        <UserProfileModal
          profile={modalProfile}
          currentProfile={currentProfile}
          onClose={() => setModalProfile(null)}
        />
      )}
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3.5 glass-strong border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Hash className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                {roomName}
              </h1>
              {roomDescription && (
                <p className="text-xs text-slate-400 truncate">{roomDescription}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowVirtual(true)}
              title="Åben virtuelt rum"
              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
            >
              <Boxes className="w-4 h-4" />
            </button>
            {isAdmin && (
              <button
                onClick={handleClearChat}
                title="Tøm chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Users className="inline w-3 h-3 mr-0.5" />
                {onlineCount}
              </span>
            </div>
            <div className={`${connected ? "text-emerald-500" : "text-rose-500"}`}>
              {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 text-sm animate-pulse">Indlæser beskeder...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <Hash className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{roomName}</p>
              <p className="text-sm text-slate-400">Ingen beskeder endnu — vær den første!</p>
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
          className="absolute bottom-24 md:bottom-20 right-6 w-9 h-9 rounded-full glass shadow-lg border border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center hover:scale-105 transition-transform animate-fade-in z-10"
        >
          ↓
        </button>
      )}

      <div className="flex-shrink-0">
        <ChatInput
          onSend={sendMessage}
          currentProfile={currentProfile}
          disabled={!connected}
        />
      </div>
    </div>
  );
}
