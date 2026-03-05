"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { X, Shield, ShieldOff, VolumeX, Volume2, Ban, UserCheck } from "lucide-react";
import type { Profile } from "@/types";

interface UserProfileModalProps {
  profile: Profile;
  currentProfile: Profile;
  onClose: () => void;
}

export function UserProfileModal({ profile, currentProfile, onClose }: UserProfileModalProps) {
  const isAdmin = currentProfile.role === "admin";
  const isSelf = currentProfile.id === profile.id;
  const [loading, setLoading] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);

  const isMuted =
    localProfile.muted_until !== null &&
    new Date(localProfile.muted_until) > new Date();

  const update = async (patch: Partial<Profile>) => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", localProfile.id)
      .select()
      .single();
    if (data) setLocalProfile(data as Profile);
    setLoading(false);
  };

  const mute = async (minutes: number | null) => {
    if (minutes === null) {
      await update({ muted_until: null });
    } else {
      const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      await update({ muted_until: until });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white dark:bg-[#16161e] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative h-20 bg-gradient-to-br from-primary-500 to-primary-700">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar overlapping header */}
        <div className="px-5 pb-5">
          <div className="-mt-8 mb-3">
            <Avatar
              name={localProfile.display_name}
              color={localProfile.avatar_color}
              size="lg"
            />
          </div>

          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">
                  {localProfile.display_name}
                </h2>
                {localProfile.role === "admin" && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20">
                    🛡 MOD
                  </span>
                )}
                {localProfile.is_banned && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/20">
                    Udelukket
                  </span>
                )}
                {isMuted && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                    Muttet
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">@{localProfile.username}</p>
            </div>
          </div>

          {localProfile.bio && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {localProfile.bio}
            </p>
          )}

          {/* Admin controls */}
          {isAdmin && !isSelf && (
            <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Moderator
              </p>

              {/* Mute */}
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Mute bruger</p>
                {isMuted ? (
                  <button
                    onClick={() => mute(null)}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50 w-full"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Fjern mute
                  </button>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "15 min", minutes: 15 },
                      { label: "1 time", minutes: 60 },
                      { label: "24 timer", minutes: 60 * 24 },
                      { label: "Permanent", minutes: 60 * 24 * 365 * 10 },
                    ].map(({ label, minutes }) => (
                      <button
                        key={label}
                        onClick={() => mute(minutes)}
                        disabled={loading}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50 text-center"
                      >
                        <VolumeX className="w-3 h-3 flex-shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ban / Unban */}
              <div>
                {localProfile.is_banned ? (
                  <button
                    onClick={() => update({ is_banned: false })}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50 w-full"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Fjern udelukkelse
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(`Udeluk ${localProfile.display_name} permanent?`))
                        update({ is_banned: true });
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50 w-full"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Udeluk bruger
                  </button>
                )}
              </div>

              {/* Promote / Demote */}
              <div>
                {localProfile.role === "admin" ? (
                  <button
                    onClick={() => {
                      if (confirm(`Fjern admin fra ${localProfile.display_name}?`))
                        update({ role: "user" });
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors disabled:opacity-50 w-full"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    Fjern moderator
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(`Gør ${localProfile.display_name} til moderator?`))
                        update({ role: "admin" });
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors disabled:opacity-50 w-full"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Gør til moderator
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
