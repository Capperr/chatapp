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

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profileData) redirect("/login");

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
