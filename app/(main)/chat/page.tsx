import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom } from "@/components/chat/ChatRoom";
import type { MessageWithProfile, Profile } from "@/types";

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Fetch last 100 messages with profiles
  const { data: messages } = await supabase
    .from("messages")
    .select("*, profiles(*)")
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <ChatRoom
      initialMessages={(messages ?? []) as MessageWithProfile[]}
      currentProfile={profile as Profile}
    />
  );
}
