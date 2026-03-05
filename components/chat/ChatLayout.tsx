"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RoomsSidebar } from "./RoomsSidebar";
import { ChatRoom } from "./ChatRoom";
import { ConversationRoom } from "./ConversationRoom";
import { UserProfileModal } from "./UserProfileModal";
import type { ChatRoom as ChatRoomType, Conversation, Profile } from "@/types";
import { Menu } from "lucide-react";

interface ChatLayoutProps {
  rooms: ChatRoomType[];
  conversations: Conversation[];
  allUsers: Profile[];
  currentProfile: Profile;
  defaultRoomId: string;
  initialRoomId: string | null;
  initialConvId: string | null;
}

export function ChatLayout({
  rooms: initialRooms,
  conversations: initialConvs,
  allUsers,
  currentProfile,
  defaultRoomId,
  initialRoomId,
  initialConvId,
}: ChatLayoutProps) {
  const router = useRouter();
  const [liveProfile, setLiveProfile] = useState(currentProfile);
  const [rooms, setRooms] = useState<ChatRoomType[]>(initialRooms);
  const [conversations, setConversations] = useState<Conversation[]>(initialConvs);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(
    initialConvId ? null : (initialRoomId ?? defaultRoomId ?? null)
  );
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId);
  const [showSidebar, setShowSidebar] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [onlineModalUser, setOnlineModalUser] = useState<Profile | null>(null);

  // Realtime: update current user's profile (mute/ban takes effect immediately)
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("my-profile")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${currentProfile.id}` },
        (payload) => { setLiveProfile(payload.new as typeof currentProfile); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentProfile.id]);

  // Global presence tracking
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("global-presence", {
        config: { presence: { key: currentProfile.id } },
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = new Set(
          Object.values(state)
            .flat()
            .map((p) => p.user_id)
        );
        setOnlineUserIds(ids);
      })
      .subscribe();

    channel.track({ user_id: currentProfile.id });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfile.id]);

  // Listen for room changes (admin creates/deletes rooms)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("rooms-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        async () => {
          const { data } = await supabase
            .from("chat_rooms")
            .select("*")
            .order("created_at", { ascending: true });
          if (data) setRooms(data as ChatRoomType[]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Listen for new conversations (DMs/groups)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("my-conversations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_members",
          filter: `user_id=eq.${currentProfile.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("conversations")
            .select("*, conversation_members(*, profiles(*))")
            .eq("id", payload.new.conversation_id)
            .single();
          if (data) {
            setConversations((prev) => {
              if (prev.some((c) => c.id === data.id)) return prev;
              return [data as unknown as Conversation, ...prev];
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentProfile.id]);

  const selectRoom = useCallback(
    (roomId: string) => {
      setActiveRoomId(roomId);
      setActiveConvId(null);
      setShowSidebar(false);
      router.push(`/chat?r=${roomId}`, { scroll: false });
    },
    [router]
  );

  const selectConv = useCallback(
    (convId: string) => {
      setActiveConvId(convId);
      setActiveRoomId(null);
      setShowSidebar(false);
      router.push(`/chat?c=${convId}`, { scroll: false });
    },
    [router]
  );

  const handleStartDM = async (targetUserId: string) => {
    // Check for existing DM with this user
    const existing = conversations.find(
      (c) =>
        c.type === "dm" &&
        c.conversation_members?.some((m) => m.user_id === targetUserId)
    );
    if (existing) {
      selectConv(existing.id);
      return;
    }

    const supabase = createClient();
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ type: "dm", created_by: currentProfile.id })
      .select()
      .single();

    if (error || !conv) {
      console.error("DM creation failed:", error);
      return;
    }

    const { error: membersError } = await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: currentProfile.id },
      { conversation_id: conv.id, user_id: targetUserId },
    ]);
    if (membersError) console.error("DM members insert failed:", membersError);

    const newConv: Conversation = {
      ...conv,
      conversation_members: [
        {
          conversation_id: conv.id,
          user_id: currentProfile.id,
          joined_at: new Date().toISOString(),
          profiles: currentProfile,
        },
        {
          conversation_id: conv.id,
          user_id: targetUserId,
          joined_at: new Date().toISOString(),
          profiles: allUsers.find((u) => u.id === targetUserId),
        },
      ],
    };

    setConversations((prev) => [newConv, ...prev]);
    selectConv(conv.id);
  };

  const handleCreateRoom = async (name: string, description: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_rooms")
      .insert({ name, description: description || null, created_by: currentProfile.id })
      .select()
      .single();
    if (data) {
      setRooms((prev) => [...prev, data as ChatRoomType]);
      selectRoom(data.id);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    const supabase = createClient();
    await supabase.from("chat_rooms").delete().eq("id", roomId);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    if (activeRoomId === roomId) {
      const fallback = rooms.find((r) => r.id !== roomId && r.is_default) ?? rooms.find((r) => r.id !== roomId);
      if (fallback) selectRoom(fallback.id);
    }
  };

  const handleSetDefaultRoom = async (roomId: string) => {
    const supabase = createClient();
    await supabase.from("chat_rooms").update({ is_default: false }).eq("is_default", true);
    await supabase.from("chat_rooms").update({ is_default: true }).eq("id", roomId);
    setRooms((prev) => prev.map((r) => ({ ...r, is_default: r.id === roomId })));
  };

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    const supabase = createClient();
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ type: "group", name, created_by: currentProfile.id })
      .select()
      .single();

    if (error || !conv) {
      console.error("Group creation failed:", error);
      return;
    }

    const allMembers = Array.from(new Set([currentProfile.id, ...memberIds]));
    const { error: membersError } = await supabase.from("conversation_members").insert(
      allMembers.map((uid) => ({ conversation_id: conv.id, user_id: uid }))
    );
    if (membersError) console.error("Group members insert failed:", membersError);

    const newConv: Conversation = {
      ...conv,
      conversation_members: allMembers.map((uid) => ({
        conversation_id: conv.id,
        user_id: uid,
        joined_at: new Date().toISOString(),
        profiles: allUsers.find((u) => u.id === uid),
      })),
    };

    setConversations((prev) => [newConv, ...prev]);
    selectConv(conv.id);
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen relative">
      {/* Online user profile modal — rendered here (not inside sidebar) to escape transform stacking context */}
      {onlineModalUser && (
        <UserProfileModal
          profile={onlineModalUser}
          currentProfile={liveProfile}
          onClose={() => setOnlineModalUser(null)}
          onStartDM={() => {
            handleStartDM(onlineModalUser.id);
            setOnlineModalUser(null);
          }}
        />
      )}

      {/* Sidebar overlay for mobile */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Rooms sidebar */}
      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-40 md:z-auto
          w-64 flex-shrink-0
          transform transition-transform duration-300
          md:translate-x-0
          ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          md:block
        `}
      >
        <RoomsSidebar
          rooms={rooms}
          conversations={conversations}
          allUsers={allUsers}
          currentProfile={liveProfile}
          onlineUserIds={onlineUserIds}
          activeRoomId={activeRoomId}
          activeConvId={activeConvId}
          onSelectRoom={selectRoom}
          onSelectConv={selectConv}
          onStartDM={handleStartDM}
          onCreateRoom={handleCreateRoom}
          onDeleteRoom={handleDeleteRoom}
          onSetDefaultRoom={handleSetDefaultRoom}
          onCreateGroup={handleCreateGroup}
          onOpenOnlineProfile={setOnlineModalUser}
          onClose={() => setShowSidebar(false)}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {activeRoomId && !activeConvId && (
          <ChatRoom
            key={activeRoomId}
            roomId={activeRoomId}
            roomName={activeRoom?.name ?? ""}
            roomDescription={activeRoom?.description ?? ""}
            currentProfile={liveProfile}
            onToggleSidebar={() => setShowSidebar(true)}
          />
        )}
        {activeConvId && (
          <ConversationRoom
            key={activeConvId}
            convId={activeConvId}
            currentProfile={liveProfile}
            allUsers={allUsers}
            onToggleSidebar={() => setShowSidebar(true)}
          />
        )}
        {!activeRoomId && !activeConvId && (
          <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.06]"
            >
              <Menu className="w-6 h-6" />
            </button>
            <p className="text-sm">Vælg et rum eller en samtale</p>
          </div>
        )}
      </div>
    </div>
  );
}
