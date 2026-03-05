import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminUserTable } from "@/components/admin/AdminUserTable";
import { Users, MessageCircle, MicOff, ShieldCheck, ArrowLeft, Lock, Hash } from "lucide-react";
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

  // Fetch recent conversation messages (admin can see all via RLS v6)
  const { data: convMsgs } = await supabase
    .from("conversation_messages")
    .select("*, profiles(*), conversations(id, type, name, conversation_members(user_id, profiles(display_name)))")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

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

      {/* Private messages section */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-violet-500" />
          Private beskeder &amp; grupper
          <span className="text-sm font-normal text-slate-400">(seneste 50)</span>
        </h2>
        <div className="card divide-y divide-black/[0.04] dark:divide-white/[0.04] overflow-hidden">
          {(convMsgs ?? []).length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">Ingen private beskeder</p>
          ) : (
            (convMsgs ?? []).map((msg: {
              id: string;
              content: string;
              created_at: string;
              profiles: { display_name: string };
              conversations: {
                id: string;
                type: string;
                name: string | null;
                conversation_members: { user_id: string; profiles: { display_name: string } }[];
              };
            }) => {
              const conv = msg.conversations;
              const members = conv?.conversation_members ?? [];
              const convLabel = conv?.type === "group"
                ? conv.name ?? "Gruppe"
                : members.map((m) => m.profiles?.display_name).filter(Boolean).join(", ");
              return (
                <div key={msg.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${conv?.type === "group" ? "bg-violet-50 dark:bg-violet-500/10" : "bg-primary-50 dark:bg-primary-500/10"}`}>
                    {conv?.type === "group" ? (
                      <Users className="w-3.5 h-3.5 text-violet-500" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 text-primary-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {msg.profiles?.display_name}
                      </span>
                      <span className="text-[10px] text-slate-400">→ {convLabel}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {new Date(msg.created_at).toLocaleString("da-DK", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
