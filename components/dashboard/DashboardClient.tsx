"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { formatKr } from "@/lib/tax";
import { formatTime } from "@/lib/utils";
import type { Profile, MessageWithProfile, ChatRoom } from "@/types";
import {
  MessageCircle,
  Users,
  Hash,
  Calculator,
  TrendingUp,
  ArrowRight,
  Zap,
} from "lucide-react";

interface DashboardClientProps {
  profile: Profile;
  userCount: number;
  msgCount: number;
  roomCount: number;
  rooms: ChatRoom[];
  recentMessages: MessageWithProfile[];
  periodTotal: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function DashboardClient({
  profile,
  userCount,
  msgCount,
  roomCount,
  rooms,
  recentMessages,
  periodTotal,
}: DashboardClientProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 10 ? "Godmorgen" : hour < 17 ? "God dag" : hour < 21 ? "God eftermiddag" : "Godaften";

  const defaultRoom = rooms.find((r) => r.is_default) ?? rooms[0];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="card p-6 bg-gradient-to-br from-primary-600 to-primary-800 border-none text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={profile.display_name}
              color={profile.avatar_color}
              size="lg"
              showOnline
            />
            <div>
              <p className="text-primary-200 text-sm font-medium">{greeting},</p>
              <h1 className="text-2xl font-bold">{profile.display_name}</h1>
              <p className="text-primary-300 text-sm">@{profile.username}</p>
            </div>
          </div>
          <div className="hidden md:flex w-12 h-12 rounded-xl bg-white/10 items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Registrerede brugere"
          value={userCount}
          color="text-primary-600 dark:text-primary-400"
          bg="bg-primary-50 dark:bg-primary-500/10"
        />
        <StatCard
          icon={MessageCircle}
          label="Beskeder i alt"
          value={msgCount}
          color="text-cyan-600 dark:text-cyan-400"
          bg="bg-cyan-50 dark:bg-cyan-500/10"
        />
        <StatCard
          icon={Hash}
          label="Chat rum"
          value={roomCount}
          color="text-violet-600 dark:text-violet-400"
          bg="bg-violet-50 dark:bg-violet-500/10"
        />
        <StatCard
          icon={Calculator}
          label="Indkørt (aktuel periode)"
          value={formatKr(periodTotal)}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-500/10"
          sub={periodTotal > 0 ? "Se afregning for detaljer" : "Ingen vagter endnu"}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent messages */}
        <div className="md:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary-500" />
              Seneste beskeder
            </h2>
            {defaultRoom && (
              <Link
                href={`/chat?r=${defaultRoom.id}`}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                Se alle <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          {recentMessages.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Ingen beskeder endnu</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {recentMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 px-5 py-3">
                  <Avatar
                    name={msg.profiles.display_name}
                    color={msg.profiles.avatar_color}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {msg.profiles.display_name}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions + rooms */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="card p-5 space-y-2">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              Hurtige genveje
            </h2>
            {[
              { href: defaultRoom ? `/chat?r=${defaultRoom.id}` : "/chat", icon: MessageCircle, label: "Gå til chat", color: "text-primary-600 bg-primary-50 dark:bg-primary-500/10" },
              { href: "/accounting", icon: Calculator, label: "Min afregning", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                <ArrowRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
              </Link>
            ))}
          </div>

          {/* Rooms */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-violet-500" />
              Chat rum
            </h2>
            <div className="space-y-1.5">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/chat?r=${room.id}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
                    <Hash className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{room.name}</p>
                    {room.description && (
                      <p className="text-[11px] text-slate-400 truncate">{room.description}</p>
                    )}
                  </div>
                  {room.is_default && (
                    <span className="ml-auto text-[10px] text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                      standard
                    </span>
                  )}
                </Link>
              ))}
              {rooms.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">Ingen rum endnu</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
