"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { MuteDialog } from "./MuteDialog";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Search, MicOff, ShieldCheck, ShieldX, Trash2,
  Volume2, Crown, User, MoreVertical
} from "lucide-react";
import type { Profile } from "@/types";

interface AdminUserTableProps {
  users: Profile[];
  currentUserId: string;
  messageCounts: Record<string, number>;
}

export function AdminUserTable({ users, currentUserId, messageCounts }: AdminUserTableProps) {
  const [search, setSearch] = useState("");
  const [list, setList] = useState<Profile[]>(users);
  const [muteTarget, setMuteTarget] = useState<Profile | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const supabase = createClient();

  const filtered = list.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.display_name.toLowerCase().includes(q)
    );
  });

  const updateUser = (id: string, patch: Partial<Profile>) => {
    setList((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const handleMute = async (userId: string, minutes: number) => {
    const muted_until =
      minutes === -1
        ? null
        : new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const is_banned = minutes === -1;

    const { error } = await supabase
      .from("profiles")
      .update({ muted_until, is_banned })
      .eq("id", userId);

    if (!error) updateUser(userId, { muted_until, is_banned });
  };

  const handleUnmute = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ muted_until: null, is_banned: false })
      .eq("id", userId);
    if (!error) updateUser(userId, { muted_until: null, is_banned: false });
  };

  const handleToggleAdmin = async (user: Profile) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", user.id);
    if (!error) updateUser(user.id, { role: newRole });
    setOpenMenu(null);
  };

  const handleDeleteMessages = async (userId: string) => {
    if (!confirm("Slet alle beskeder fra denne bruger?")) return;
    await supabase
      .from("messages")
      .update({ is_deleted: true })
      .eq("user_id", userId);
    setOpenMenu(null);
  };

  const getUserStatus = (u: Profile) => {
    if (u.is_banned) return { label: "Bannet", color: "text-rose-500 bg-rose-50 dark:bg-rose-500/10" };
    if (u.muted_until && new Date(u.muted_until) > new Date())
      return { label: "Muted", color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" };
    return { label: "Aktiv", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" };
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søg efter brugernavn eller navn..."
          className="input-base pl-10"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
                {["Bruger", "Rolle", "Status", "Beskeder", "Oprettet", "Handlinger"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {filtered.map((user) => {
                const status = getUserStatus(user);
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.display_name} color={user.avatar_color} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {user.display_name}
                            {isSelf && <span className="ml-1.5 text-[10px] text-slate-400">(dig)</span>}
                          </p>
                          <p className="text-xs text-slate-400">@{user.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                        user.role === "admin"
                          ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10"
                          : "text-slate-500 bg-slate-100 dark:bg-white/[0.06]"
                      )}>
                        {user.role === "admin" ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {user.role === "admin" ? "Admin" : "Bruger"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium px-2 py-1 rounded-full", status.color)}>
                        {status.label}
                      </span>
                    </td>

                    {/* Message count */}
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {messageCounts[user.id] ?? 0}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="text-xs text-slate-300 dark:text-slate-600 italic">—</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {/* Mute / Unmute */}
                          {user.is_banned || (user.muted_until && new Date(user.muted_until) > new Date()) ? (
                            <button
                              onClick={() => handleUnmute(user.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                              title="Ophæv mute/ban"
                            >
                              <Volume2 className="w-3 h-3" />
                              Ophæv
                            </button>
                          ) : (
                            <button
                              onClick={() => setMuteTarget(user)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                              title="Mute bruger"
                            >
                              <MicOff className="w-3 h-3" />
                              Mute
                            </button>
                          )}

                          {/* More actions */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenu === user.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 glass-strong rounded-xl shadow-xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden z-10 animate-fade-in">
                                <button
                                  onClick={() => handleToggleAdmin(user)}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                                >
                                  {user.role === "admin" ? (
                                    <><ShieldX className="w-4 h-4 text-rose-500" /> Fjern admin</>
                                  ) : (
                                    <><ShieldCheck className="w-4 h-4 text-primary-500" /> Giv admin</>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteMessages(user.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" /> Slet alle beskeder
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              Ingen brugere matcher din søgning
            </div>
          )}
        </div>
      </div>

      {/* Mute dialog */}
      {muteTarget && (
        <MuteDialog
          user={muteTarget}
          onConfirm={handleMute}
          onClose={() => setMuteTarget(null)}
        />
      )}
    </div>
  );
}
