"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Check, X, VolumeX, Ban, Smartphone } from "lucide-react";
import type { MessageWithProfile, Profile } from "@/types";

interface ChatMessageProps {
  message: MessageWithProfile;
  isOwn: boolean;
  showAvatar: boolean;
  showHeader: boolean;
  currentUsername: string;
  isAdmin: boolean;
  isMobile?: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onOpenProfile?: (profile: Profile) => void;
}

function MessageContent({
  content,
  currentUsername,
  isOwn,
}: {
  content: string;
  currentUsername: string;
  isOwn: boolean;
}) {
  const parts = content.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const isMe = part.toLowerCase() === `@${currentUsername.toLowerCase()}`;
          return (
            <span
              key={i}
              className={cn(
                "font-semibold rounded px-0.5",
                isMe
                  ? isOwn
                    ? "bg-white/20 text-white"
                    : "bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300"
                  : isOwn
                  ? "text-white/80"
                  : "text-primary-600 dark:text-primary-400"
              )}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function ChatMessage({
  message,
  isOwn,
  showAvatar,
  showHeader,
  currentUsername,
  isAdmin,
  isMobile,
  onDelete,
  onEdit,
  onOpenProfile,
}: ChatMessageProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const canEdit = (isOwn || isAdmin) && !message.is_deleted;
  const canDelete = (isOwn || isAdmin) && !message.is_deleted;
  const mentionsMe =
    !isOwn &&
    message.content.toLowerCase().includes(`@${currentUsername.toLowerCase()}`);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [editing, editContent.length]);

  const handleEditSubmit = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(message.id, trimmed);
    }
    setEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    }
    if (e.key === "Escape") {
      setEditContent(message.content);
      setEditing(false);
    }
  };

  const profile = message.profiles;

  return (
    <div
      className={cn(
        "flex gap-2.5 group message-enter relative",
        isOwn ? "flex-row-reverse" : "flex-row",
        mentionsMe &&
          "rounded-xl -mx-2 px-2 py-1 bg-primary-50 dark:bg-primary-500/5 border border-primary-200/50 dark:border-primary-500/10"
      )}
    >
      {/* Avatar */}
      <div className={cn("flex-shrink-0 w-8", !showAvatar && "invisible")}>
        {showAvatar && (
          <button onClick={() => onOpenProfile?.(profile)} className="block rounded-full focus:outline-none">
            <Avatar name={profile.display_name} color={profile.avatar_color} size="sm" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={cn("max-w-[70%] min-w-0", isOwn && "items-end flex flex-col")}>
        {/* Header */}
        {showHeader && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1 px-1 flex-wrap">
            <button
              onClick={() => onOpenProfile?.(profile)}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline"
            >
              {profile.display_name}
            </button>
            {profile.role === "admin" && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20">
                🛡 MOD
              </span>
            )}
            {profile.is_banned && (
              <span title="Udelukket bruger"><Ban className="w-3 h-3 text-rose-400" /></span>
            )}
            {!profile.is_banned && profile.muted_until && new Date(profile.muted_until) > new Date() && (
              <span title="Muted"><VolumeX className="w-3 h-3 text-amber-400" /></span>
            )}
            {isMobile && (
              <span title="På mobil"><Smartphone className="w-3 h-3 text-slate-400" /></span>
            )}
            <span className="text-[10px] text-slate-400">@{profile.username}</span>
          </div>
        )}

        {/* Deleted */}
        {message.is_deleted ? (
          <div
            className={cn(
              "px-4 py-2.5 rounded-2xl text-sm italic",
              isOwn ? "rounded-tr-sm" : "rounded-tl-sm",
              "bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 border border-black/[0.04] dark:border-white/[0.04]"
            )}
          >
            🗑 Besked slettet
          </div>
        ) : editing ? (
          /* Edit mode */
          <div className="flex flex-col gap-2 min-w-48 w-full">
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="px-3 py-2 rounded-xl text-sm bg-white dark:bg-white/10 border border-primary-300 dark:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-slate-800 dark:text-slate-200 resize-none leading-relaxed"
              rows={2}
              maxLength={2000}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setEditContent(message.content); setEditing(false); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-3 h-3" /> Annuller
              </button>
              <button
                onClick={handleEditSubmit}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-primary-600 hover:bg-primary-500 text-white transition-colors"
              >
                <Check className="w-3 h-3" /> Gem
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-right">Enter for at gemme · Esc for at annullere</p>
          </div>
        ) : (
          /* Normal bubble */
          <div className="relative group/bubble">
            <div
              className={cn(
                "px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words",
                isOwn
                  ? "bg-primary-600 text-white rounded-tr-sm"
                  : "bg-white dark:bg-white/[0.07] text-slate-800 dark:text-slate-200 border border-black/[0.06] dark:border-white/[0.06] rounded-tl-sm shadow-sm",
                mentionsMe && !isOwn && "border-primary-300 dark:border-primary-500/30"
              )}
            >
              <MessageContent content={message.content} currentUsername={currentUsername} isOwn={isOwn} />
              {message.edited_at && (
                <span className="text-[10px] opacity-50 ml-2 italic">redigeret</span>
              )}
            </div>

            {/* Timestamp on hover */}
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity text-[10px] text-slate-400 whitespace-nowrap pointer-events-none",
                isOwn ? "-left-2 -translate-x-full pr-2" : "-right-2 translate-x-full pl-2"
              )}
            >
              {formatTime(message.created_at)}
            </div>

            {/* Action buttons on bubble hover */}
            {(canEdit || canDelete) && (
              <div
                className={cn(
                  "absolute -top-3.5 flex gap-1 opacity-0 group-hover/bubble:opacity-100 transition-all",
                  isOwn ? "left-1" : "right-1"
                )}
              >
                {canEdit && (
                  <button
                    onClick={() => setEditing(true)}
                    className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 shadow-md border border-black/[0.08] dark:border-white/[0.12] flex items-center justify-center text-slate-500 hover:text-primary-600 hover:border-primary-300 transition-colors"
                    title="Rediger"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(message.id)}
                    className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 shadow-md border border-black/[0.08] dark:border-white/[0.12] flex items-center justify-center text-slate-500 hover:text-rose-500 hover:border-rose-300 transition-colors"
                    title="Slet"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
