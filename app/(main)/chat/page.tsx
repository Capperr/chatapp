import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChatGateway } from "@/components/chat/ChatGateway";
import type { ChatRoom, Conversation, Profile } from "@/types";

interface PageProps {
  searchParams: { r?: string; c?: string };
}

export default async function ChatPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <ChatGateway />;

  let { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Auto-create profile if missing (prevents redirect loop for users without a profile row)
  if (!profileData) {
    const emailPrefix = user.email?.split("@")[0]?.replace(/[^a-z0-9]/gi, "_").toLowerCase() ?? "user";
    const uniqueUsername = `${emailPrefix}_${Date.now().toString(36)}`;
    const { data: created } = await supabase
      .from("profiles")
      .insert({ id: user.id, username: uniqueUsername, display_name: emailPrefix, avatar_color: "#8b5cf6" })
      .select("*")
      .single();
    profileData = created;
  }
  if (!profileData) redirect("/");

  const profile = profileData as Profile;

  // Fetch all rooms
  const { data: roomsData } = await supabase
    .from("chat_rooms")
    .select("*")
    .order("created_at", { ascending: true });

  const rooms = (roomsData ?? []) as ChatRoom[];
  const defaultRoom = rooms.find((r) => r.is_default) ?? rooms[0] ?? null;

  // Fetch this user's conversations with their members + profiles
  const { data: memberRows } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);

  const convIds = (memberRows ?? []).map(
    (m: { conversation_id: string }) => m.conversation_id
  );

  let conversations: Conversation[] = [];
  if (convIds.length > 0) {
    const { data: convData } = await supabase
      .from("conversations")
      .select("*, conversation_members(*, profiles(*))")
      .in("id", convIds)
      .order("created_at", { ascending: false });
    conversations = (convData as unknown as Conversation[]) ?? [];
  }

  // All profiles for online list + group creation
  const { data: allUsersData } = await supabase
    .from("profiles")
    .select("*")
    .order("display_name", { ascending: true });

  const allUsers = (allUsersData ?? []) as Profile[];

  const initialRoomId = searchParams.c
    ? null
    : (searchParams.r ?? defaultRoom?.id ?? null);
  const initialConvId = searchParams.c ?? null;

  return (
    <ChatLayout
      rooms={rooms}
      conversations={conversations}
      allUsers={allUsers}
      currentProfile={profile}
      defaultRoomId={defaultRoom?.id ?? ""}
      initialRoomId={initialRoomId}
      initialConvId={initialConvId}
    />
  );
}
