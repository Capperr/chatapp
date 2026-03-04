import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminUserTable } from "@/components/admin/AdminUserTable";
import { Users, MessageCircle, MicOff, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/types";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check admin role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "admin") {
    redirect("/chat");
  }

  // Fetch all users
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  // Fetch message counts per user
  const { data: msgData } = await supabase
    .from("messages")
    .select("user_id")
    .eq("is_deleted", false);

  const messageCounts: Record<string, number> = {};
  (msgData ?? []).forEach((m: { user_id: string }) => {
    messageCounts[m.user_id] = (messageCounts[m.user_id] ?? 0) + 1;
  });

  // Stats
  const allUsers = (users ?? []) as Profile[];
  const totalMessages = Object.values(messageCounts).reduce((a, b) => a + b, 0);
  const mutedCount = allUsers.filter(
    (u) => u.is_banned || (u.muted_until && new Date(u.muted_until) > new Date())
  ).length;
  const adminCount = allUsers.filter((u) => u.role === "admin").length;

  const stats = [
    { icon: Users, label: "Brugere i alt", value: allUsers.length, color: "text-primary-500", bg: "bg-primary-50 dark:bg-primary-500/10" },
    { icon: MessageCircle, label: "Beskeder i alt", value: totalMessages, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-500/10" },
    { icon: MicOff, label: "Muted / Bannede", value: mutedCount, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
    { icon: ShieldCheck, label: "Admins", value: adminCount, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/chat"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary-500" />
            Admin Panel
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administrer brugere og indhold
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="card p-5 text-center space-y-2">
            <div className={`inline-flex p-2.5 rounded-xl ${bg} mb-1`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Users section */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-500" />
          Brugerstyring
        </h2>
        <AdminUserTable
          users={allUsers}
          currentUserId={user.id}
          messageCounts={messageCounts}
        />
      </div>
    </div>
  );
}
