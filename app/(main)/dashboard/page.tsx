import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { Profile, MessageWithProfile, ChatRoom } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profileData) redirect("/login");

  const profile = profileData as Profile;

  // Stats
  const [
    { count: userCount },
    { count: msgCount },
    { data: roomsData },
    { data: recentData },
    { data: accountingData },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("messages").select("*", { count: "exact", head: true }).eq("is_deleted", false),
    supabase.from("chat_rooms").select("*").order("created_at"),
    supabase
      .from("messages")
      .select("*, profiles(*)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("accounting_shifts")
      .select("total_indkoert, shift_date")
      .eq("user_id", user.id)
      .order("shift_date", { ascending: false })
      .limit(30),
  ]);

  const rooms = (roomsData ?? []) as ChatRoom[];
  const recentMessages = ((recentData ?? []) as MessageWithProfile[]).reverse();

  // Current accounting period total
  const periodTotal = (accountingData ?? []).reduce(
    (sum: number, s: { total_indkoert: number }) => sum + s.total_indkoert,
    0
  );

  return (
    <DashboardClient
      profile={profile}
      userCount={userCount ?? 0}
      msgCount={msgCount ?? 0}
      roomCount={rooms.length}
      rooms={rooms}
      recentMessages={recentMessages}
      periodTotal={periodTotal}
    />
  );
}
