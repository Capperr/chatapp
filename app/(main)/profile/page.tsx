import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { formatDate } from "@/lib/utils";
import { Calendar, MessageCircle, Shield } from "lucide-react";
import type { Profile } from "@/types";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Fetch message count
  const { count: messageCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Min Profil
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Tilpas dit profilseende
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: MessageCircle,
            label: "Beskeder",
            value: messageCount ?? 0,
            color: "text-primary-500",
            bg: "bg-primary-50 dark:bg-primary-500/10",
          },
          {
            icon: Calendar,
            label: "Medlem siden",
            value: formatDate(profile.created_at),
            color: "text-cyan-500",
            bg: "bg-cyan-50 dark:bg-cyan-500/10",
          },
          {
            icon: Shield,
            label: "Status",
            value: "Aktiv",
            color: "text-emerald-500",
            bg: "bg-emerald-50 dark:bg-emerald-500/10",
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div
            key={label}
            className="card p-4 text-center space-y-1.5"
          >
            <div className={`inline-flex p-2 rounded-xl ${bg} mb-1`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {value}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Edit form */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-5">
          Rediger profil
        </h2>
        <ProfileForm profile={profile as Profile} />
      </div>

      {/* Account info */}
      <div className="card p-6 space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          Kontoinformation
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-sm text-slate-500 dark:text-slate-400">E-mail</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {user.email}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-sm text-slate-500 dark:text-slate-400">Brugernavn</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              @{profile.username}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Bruger ID</span>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate max-w-32">
              {user.id.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
