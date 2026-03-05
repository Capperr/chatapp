"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";
import { playNotificationSound } from "@/lib/sounds";

interface NotificationBellProps {
  userId: string;
  compact?: boolean;
}

export function NotificationBell({ userId, compact }: NotificationBellProps) {
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch initial unread count
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(({ count }) => setUnread(count ?? 0));

    // Realtime subscription
    const ch = supabase
      .channel("my-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setUnread((n) => n + 1);
          setNotifications((prev) => [payload.new as AppNotification, ...prev.slice(0, 9)]);
          setLoaded(false);
          playNotificationSound();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const loadNotifications = async () => {
    if (loaded) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*, sender:sender_id(id, display_name, avatar_color, username), room:room_id(id, name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    setNotifications((data as AppNotification[]) ?? []);
    setLoaded(true);
  };

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadNotifications();
      // Mark all as read
      if (unread > 0) {
        const supabase = createClient();
        await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
        setUnread(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    }
  };

  const handleClick = (n: AppNotification) => {
    setOpen(false);
    if (n.room_id) router.push(`/chat?r=${n.room_id}`);
    else if (n.conversation_id) router.push(`/chat?c=${n.conversation_id}`);
  };

  if (compact) {
    return (
      <button
        onClick={handleOpen}
        className={cn(
          "relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
          open ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
        )}
      >
        <div className="relative">
          <Bell className="w-6 h-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <span className="text-xs font-medium">Notif.</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={cn(
          "relative nav-link w-full",
          open && "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
        )}
      >
        <Bell className="w-5 h-5" />
        Notifikationer
        {unread > 0 && (
          <span className="ml-auto min-w-[1.25rem] h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 w-80 glass-strong rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notifikationer</span>
            <a href="/notifications" className="text-xs text-primary-500 hover:underline">Se alle</a>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Ingen notifikationer</p>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell className="w-3.5 h-3.5 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {(n.sender as unknown as { display_name: string } | null)?.display_name ?? "Nogen"} taggede dig
                    </p>
                    {n.content_preview && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{n.content_preview}</p>
                    )}
                    {(n.room as unknown as { name: string } | null)?.name && (
                      <p className="text-[10px] text-slate-400 mt-0.5">#{(n.room as unknown as { name: string }).name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
