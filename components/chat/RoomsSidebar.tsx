"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { ChatRoom, Conversation, Profile } from "@/types";
import {
  Hash,
  MessageCircle,
  Users,
  Plus,
  Trash2,
  X,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Star,
} from "lucide-react";
import { UserProfileModal } from "./UserProfileModal";

interface RoomsSidebarProps {
  rooms: ChatRoom[];
  conversations: Conversation[];
  allUsers: Profile[];
  currentProfile: Profile;
  onlineUserIds: Set<string>;
  activeRoomId: string | null;
  activeConvId: string | null;
  onSelectRoom: (id: string) => void;
  onSelectConv: (id: string) => void;
  onStartDM: (userId: string) => void;
  onCreateRoom: (name: string, description: string) => void;
  onDeleteRoom: (id: string) => void;
  onSetDefaultRoom: (id: string) => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
  onClose: () => void;
}

function SectionHeader({
  title,
  count,
  onAdd,
  addLabel,
  open,
  onToggle,
}: {
  title: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 group">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {title}
        {count !== undefined && (
          <span className="ml-1 text-slate-300 dark:text-slate-600">{count}</span>
        )}
      </button>
      {onAdd && (
        <button
          onClick={onAdd}
          title={addLabel}
          className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function RoomsSidebar({
  rooms,
  conversations,
  allUsers,
  currentProfile,
  onlineUserIds,
  activeRoomId,
  activeConvId,
  onSelectRoom,
  onSelectConv,
  onStartDM,
  onCreateRoom,
  onDeleteRoom,
  onSetDefaultRoom,
  onCreateGroup,
  onClose,
}: RoomsSidebarProps) {
  const isAdmin = currentProfile.role === "admin";
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [onlineModalUser, setOnlineModalUser] = useState<Profile | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState({
    rooms: true,
    dms: true,
    groups: true,
    online: true,
  });

  const toggleSection = (key: keyof typeof sectionsOpen) =>
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const dms = conversations.filter((c) => c.type === "dm");
  const groups = conversations.filter((c) => c.type === "group");
  const onlineUsers = allUsers.filter(
    (u) => u.id !== currentProfile.id && onlineUserIds.has(u.id)
  );

  const getConvLabel = (conv: Conversation) => {
    if (conv.type === "group") return conv.name ?? "Gruppe";
    const other = conv.conversation_members?.find(
      (m) => m.user_id !== currentProfile.id
    );
    return other?.profiles?.display_name ?? "Ukendt";
  };

  const getConvProfile = (conv: Conversation): Profile | undefined => {
    if (conv.type === "group") return undefined;
    return conv.conversation_members?.find((m) => m.user_id !== currentProfile.id)
      ?.profiles;
  };

  return (
    <div className="h-full flex flex-col glass-strong border-r border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Beskeder</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {/* ROOMS */}
        <div>
          <SectionHeader
            title="Rum"
            count={rooms.length}
            onAdd={isAdmin ? () => setShowCreateRoom(true) : undefined}
            addLabel="Opret rum"
            open={sectionsOpen.rooms}
            onToggle={() => toggleSection("rooms")}
          />
          {sectionsOpen.rooms &&
            rooms.map((room) => (
              <div key={room.id} className="group relative">
                <button
                  onClick={() => onSelectRoom(room.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl mx-2 text-left transition-all",
                    activeRoomId === room.id && !activeConvId
                      ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  )}
                  style={{ width: "calc(100% - 1rem)" }}
                >
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{room.name}</span>
                  {room.is_default && (
                    <span className="ml-auto text-[9px] text-slate-400 dark:text-slate-500">
                      standard
                    </span>
                  )}
                </button>
                {isAdmin && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100">
                    {!room.is_default && (
                      <button
                        onClick={() => onSetDefaultRoom(room.id)}
                        title="Sæt som standard rum"
                        className="p-1 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}
                    {!room.is_default && (
                      <button
                        onClick={() => {
                          if (confirm(`Slet rummet "${room.name}"?`)) onDeleteRoom(room.id);
                        }}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* DIRECT MESSAGES */}
        <div>
          <SectionHeader
            title="Direkte"
            count={dms.length}
            onAdd={() => setShowUserPicker(true)}
            addLabel="Ny besked"
            open={sectionsOpen.dms}
            onToggle={() => toggleSection("dms")}
          />
          {sectionsOpen.dms &&
            dms.map((conv) => {
              const other = getConvProfile(conv);
              const label = getConvLabel(conv);
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConv(conv.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl mx-2 text-left transition-all",
                    activeConvId === conv.id
                      ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]",
                    "w-[calc(100%-1rem)]"
                  )}
                  style={{ width: "calc(100% - 1rem)" }}
                >
                  <div className="relative flex-shrink-0">
                    {other ? (
                      <Avatar name={other.display_name} color={other.avatar_color} size="xs" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
                    )}
                    {other && onlineUserIds.has(other.id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                    )}
                  </div>
                  <span className="text-sm font-medium truncate">{label}</span>
                </button>
              );
            })}
          {sectionsOpen.dms && dms.length === 0 && (
            <p className="px-5 py-1.5 text-xs text-slate-400 italic">
              Ingen direkte beskeder
            </p>
          )}
        </div>

        {/* GROUP CHATS */}
        <div>
          <SectionHeader
            title="Grupper"
            count={groups.length}
            onAdd={() => setShowCreateGroup(true)}
            addLabel="Ny gruppe"
            open={sectionsOpen.groups}
            onToggle={() => toggleSection("groups")}
          />
          {sectionsOpen.groups &&
            groups.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConv(conv.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl mx-2 text-left transition-all",
                  activeConvId === conv.id
                    ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                )}
                style={{ width: "calc(100% - 1rem)" }}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  {getConvLabel(conv)}
                </span>
                <span className="ml-auto text-[10px] text-slate-400">
                  {conv.conversation_members?.length ?? 0}
                </span>
              </button>
            ))}
        </div>

        {/* ONLINE USERS */}
        <div>
          <SectionHeader
            title="Online"
            count={onlineUsers.length}
            open={sectionsOpen.online}
            onToggle={() => toggleSection("online")}
          />
          {sectionsOpen.online &&
            onlineUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setOnlineModalUser(user)}
                title={`Vis profil for ${user.display_name}`}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl mx-2 text-left text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all group"
                style={{ width: "calc(100% - 1rem)" }}
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={user.display_name} color={user.avatar_color} size="xs" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                </div>
                <span className="text-sm truncate">{user.display_name}</span>
                <UserPlus className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary-500" />
              </button>
            ))}
          {sectionsOpen.online && onlineUsers.length === 0 && (
            <p className="px-5 py-1.5 text-xs text-slate-400 italic">
              Ingen andre online
            </p>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateRoom && (
        <CreateRoomInline
          onConfirm={(name, desc) => {
            onCreateRoom(name, desc);
            setShowCreateRoom(false);
          }}
          onCancel={() => setShowCreateRoom(false)}
        />
      )}
      {showUserPicker && (
        <UserPickerInline
          allUsers={allUsers.filter((u) => u.id !== currentProfile.id)}
          onSelect={(userId) => {
            onStartDM(userId);
            setShowUserPicker(false);
          }}
          onCancel={() => setShowUserPicker(false)}
        />
      )}
      {showCreateGroup && (
        <CreateGroupInline
          allUsers={allUsers.filter((u) => u.id !== currentProfile.id)}
          onConfirm={(name, ids) => {
            onCreateGroup(name, ids);
            setShowCreateGroup(false);
          }}
          onCancel={() => setShowCreateGroup(false)}
        />
      )}
      {onlineModalUser && (
        <UserProfileModal
          profile={onlineModalUser}
          currentProfile={currentProfile}
          onClose={() => setOnlineModalUser(null)}
          onStartDM={() => {
            onStartDM(onlineModalUser.id);
            setOnlineModalUser(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Inline modal sub-components ── */

function CreateRoomInline({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string, desc: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div className="absolute inset-0 bg-white dark:bg-[#16161e] z-50 flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300">Opret nyt rum</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Rumnavn..."
        className="input-base text-sm py-2.5"
        maxLength={50}
      />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Beskrivelse (valgfrit)"
        className="input-base text-sm py-2.5"
        maxLength={100}
      />
      <button
        onClick={() => name.trim() && onConfirm(name.trim(), desc.trim())}
        disabled={!name.trim()}
        className="btn-primary py-2.5 text-sm"
      >
        Opret rum
      </button>
    </div>
  );
}

function UserPickerInline({
  allUsers,
  onSelect,
  onCancel,
}: {
  allUsers: Profile[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = allUsers.filter(
    (u) =>
      u.display_name.toLowerCase().includes(q.toLowerCase()) ||
      u.username.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="absolute inset-0 bg-white dark:bg-[#16161e] z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Ny besked</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-3 py-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søg bruger..."
          className="input-base text-sm py-2"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u.id)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            <Avatar name={u.display_name} color={u.avatar_color} size="sm" />
            <div className="text-left">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {u.display_name}
              </p>
              <p className="text-xs text-slate-400">@{u.username}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateGroupInline({
  allUsers,
  onConfirm,
  onCancel,
}: {
  allUsers: Profile[];
  onConfirm: (name: string, memberIds: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const filtered = allUsers.filter(
    (u) =>
      u.display_name.toLowerCase().includes(q.toLowerCase()) ||
      u.username.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="absolute inset-0 bg-white dark:bg-[#16161e] z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Ny gruppe</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-3 py-2 space-y-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Gruppenavn..."
          className="input-base text-sm py-2"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tilføj medlemmer..."
          className="input-base text-sm py-2"
        />
        {selected.length > 0 && (
          <p className="text-xs text-slate-400">{selected.length} valgt</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((u) => (
          <button
            key={u.id}
            onClick={() => toggle(u.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 transition-colors",
              selected.includes(u.id)
                ? "bg-primary-50 dark:bg-primary-500/10"
                : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
            )}
          >
            <Avatar name={u.display_name} color={u.avatar_color} size="sm" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 text-left">
              {u.display_name}
            </p>
            {selected.includes(u.id) && (
              <div className="ml-auto w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-white text-[10px]">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.06]">
        <button
          onClick={() =>
            name.trim() && selected.length > 0 && onConfirm(name.trim(), selected)
          }
          disabled={!name.trim() || selected.length === 0}
          className="btn-primary py-2.5 text-sm"
        >
          Opret gruppe ({selected.length} medlemmer)
        </button>
      </div>
    </div>
  );
}
