"use client";

import { Avatar } from "@/components/ui/Avatar";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { MessageWithProfile } from "@/types";

interface ChatMessageProps {
  message: MessageWithProfile;
  isOwn: boolean;
  showAvatar: boolean;
  showHeader: boolean;
}

export function ChatMessage({
  message,
  isOwn,
  showAvatar,
  showHeader,
}: ChatMessageProps) {
  const profile = message.profiles;

  return (
    <div
      className={cn(
        "flex gap-2.5 group message-enter",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className={cn("flex-shrink-0 w-8", !showAvatar && "invisible")}>
        {showAvatar && (
          <Avatar
            name={profile.display_name}
            color={profile.avatar_color}
            size="sm"
          />
        )}
      </div>

      {/* Content */}
      <div className={cn("max-w-[70%] min-w-0", isOwn && "items-end flex flex-col")}>
        {/* Header */}
        {showHeader && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {profile.display_name}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              @{profile.username}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          <div
            className={cn(
              "px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words",
              isOwn
                ? "bg-primary-600 text-white rounded-tr-sm"
                : "bg-white dark:bg-white/[0.07] text-slate-800 dark:text-slate-200 border border-black/[0.06] dark:border-white/[0.06] rounded-tl-sm shadow-sm"
            )}
          >
            {message.content}
          </div>

          {/* Timestamp - visible on hover */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap",
              isOwn ? "-left-2 -translate-x-full pr-2" : "-right-2 translate-x-full pl-2"
            )}
          >
            {formatTime(message.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
