"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Trash2, CheckCheck, ArrowLeft, Hash, MessageCircle } from "lucide-react";
import type { AppNotification } from "@/types";
import { Avatar } from "@/components/ui/Avatar";

interface NotificationsClientProps {
  initialNotifications: AppNotification[];
}

export function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const router = useRouter();

  const deleteOne = async (id: string) => {
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteAll = async () => {
    if (!confirm("Slet alle notifikationer?")) return;
    const supabase = createClient();
    await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setNotifications([]);
  };

  const handleClick = (n: AppNotification) => {
    if (n.room_id) router.push(`/chat?r=${n.room_id}`);
    else if (n.conversation_id) router.push(`/chat?c=${n.conversation_id}`);
  };

  const sender = (n: AppNotification) => n.sender as unknown as { display_name: string; avatar_color: string; username: string } | null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-500" />
            Notifikationer
          </h1>
          <p className="text-sm text-slate-500">{notifications.length} notifikationer</p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={deleteAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Ryd alle
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mx-auto">
            <CheckCheck className="w-8 h-8 text-primary-400" />
          </div>
          <p className="font-semibold text-slate-700 dark:text-slate-300">Ingen notifikationer</p>
          <p className="text-sm text-slate-400">Du er opdateret!</p>
        </div>
      ) : (
        <div className="card divide-y divide-black/[0.04] dark:divide-white/[0.04] overflow-hidden">
          {notifications.map((n) => {
            const s = sender(n);
            const room = n.room as unknown as { name: string } | null;
            return (
              <div key={n.id} className="flex items-start gap-3 px-5 py-4">
                {s ? (
                  <button onClick={() => handleClick(n)} className="flex-shrink-0">
                    <Avatar name={s.display_name} color={s.avatar_color} size="sm" />
                  </button>
                ) : (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-primary-500" />
                  </div>
                )}
                <button
                  onClick={() => handleClick(n)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">{s?.display_name ?? "Nogen"}</span>
                    {" "}taggede dig
                    {room && <span className="text-slate-500"> i #{room.name}</span>}
                    {n.conversation_id && !room && <span className="text-slate-500"> i en samtale</span>}
                  </p>
                  {n.content_preview && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 bg-slate-50 dark:bg-white/[0.04] rounded-lg px-2 py-1.5">
                      {n.content_preview}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {new Date(n.created_at).toLocaleString("da-DK", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </button>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {n.room_id ? (
                    <Hash className="w-3.5 h-3.5 text-slate-300" />
                  ) : (
                    <MessageCircle className="w-3.5 h-3.5 text-slate-300" />
                  )}
                  <button
                    onClick={() => deleteOne(n.id)}
                    className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
