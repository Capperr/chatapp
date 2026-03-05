"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Send } from "lucide-react";
import type { Profile } from "@/types";

const SHAPES = ["circle", "square", "hexagon", "diamond", "triangle", "pentagon"] as const;
type ShapeType = typeof SHAPES[number];

function getShape(userId: string): ShapeType {
  const hash = userId.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return SHAPES[hash % SHAPES.length];
}

function shapePoints(shape: ShapeType, cx: number, cy: number, r: number): string {
  const pts = (n: number, offset = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((i * 360) / n + offset) * (Math.PI / 180);
      return `${cx + r * Math.sin(a)},${cy - r * Math.cos(a)}`;
    }).join(" ");
  switch (shape) {
    case "hexagon": return pts(6, 30);
    case "diamond": return pts(4, 0);
    case "triangle": return pts(3, 0);
    case "pentagon": return pts(5, 0);
    default: return "";
  }
}

interface AvatarProps {
  shape: ShapeType;
  color: string;
  size?: number;
}

function AvatarShape({ shape, color, size = 40 }: AvatarProps) {
  const r = size / 2 - 3;
  const c = size / 2;
  if (shape === "circle") {
    return (
      <svg width={size} height={size}>
        <circle cx={c} cy={c} r={r} fill={color} stroke="white" strokeWidth={2} />
      </svg>
    );
  }
  if (shape === "square") {
    return (
      <svg width={size} height={size}>
        <rect x={3} y={3} width={size - 6} height={size - 6} rx={4} fill={color} stroke="white" strokeWidth={2} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size}>
      <polygon points={shapePoints(shape, c, c, r)} fill={color} stroke="white" strokeWidth={2} />
    </svg>
  );
}

interface PresenceUser {
  user_id: string;
  display_name: string;
  color: string;
  shape: ShapeType;
  x: number;
  y: number;
}

interface SpeechBubble {
  userId: string;
  text: string;
  ts: number;
}

interface VirtualRoomProps {
  roomId: string;
  roomName: string;
  currentProfile: Profile;
  onClose: () => void;
}

export function VirtualRoom({ roomId, roomName, currentProfile, onClose }: VirtualRoomProps) {
  const supabase = createClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const myShape = getShape(currentProfile.id);
  const myColor = currentProfile.avatar_color ?? "#8b5cf6";

  const [users, setUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [bubbles, setBubbles] = useState<Map<string, SpeechBubble>>(new Map());
  const [myPos, setMyPos] = useState({ x: 50, y: 50 });
  const [input, setInput] = useState("");
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Sync presence position
  const trackPresence = useCallback(
    (x: number, y: number) => {
      channelRef.current?.track({
        user_id: currentProfile.id,
        display_name: currentProfile.display_name,
        color: myColor,
        shape: myShape,
        x,
        y,
      } satisfies PresenceUser);
    },
    [currentProfile.id, currentProfile.display_name, myColor, myShape]
  );

  // Drag handlers
  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const avatarPx = ((myPos.x / 100) * rect.width);
    const avatarPy = ((myPos.y / 100) * rect.height);
    dragOffset.current = {
      x: clientX - rect.left - avatarPx,
      y: clientY - rect.top - avatarPy,
    };
  };

  const onMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const rawX = clientX - rect.left - dragOffset.current.x;
      const rawY = clientY - rect.top - dragOffset.current.y;
      const x = Math.min(95, Math.max(5, (rawX / rect.width) * 100));
      const y = Math.min(95, Math.max(5, (rawY / rect.height) * 100));
      setMyPos({ x, y });
      trackPresence(x, y);
    },
    [trackPresence]
  );

  const stopDrag = () => { dragging.current = false; };

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", onMouseMove, { passive: true });
    window.addEventListener("touchend", stopDrag);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("touchend", stopDrag);
    };
  }, [onMouseMove]);

  // Supabase presence + messages
  useEffect(() => {
    const channel = supabase.channel(`virtual-${roomId}`, {
      config: { presence: { key: currentProfile.id } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const next = new Map<string, PresenceUser>();
        for (const [, presences] of Object.entries(state)) {
          const p = presences[0] as PresenceUser;
          if (p?.user_id) next.set(p.user_id, p);
        }
        setUsers(next);
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const senderId: string = payload.new.user_id;
          const content: string = payload.new.content;
          setBubbles((prev) => {
            const next = new Map(prev);
            next.set(senderId, { userId: senderId, text: content, ts: Date.now() });
            return next;
          });
          setTimeout(() => {
            setBubbles((prev) => {
              const next = new Map(prev);
              const b = next.get(senderId);
              if (b && Date.now() - b.ts >= 4900) next.delete(senderId);
              return next;
            });
          }, 5000);
        }
      )
      .subscribe();

    trackPresence(myPos.x, myPos.y);

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await supabase.from("messages").insert({
      content: text,
      user_id: currentProfile.id,
      room_id: roomId,
    });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render all users (others from presence + self)
  const allUsers: PresenceUser[] = [
    ...Array.from(users.values()).filter((u) => u.user_id !== currentProfile.id),
    {
      user_id: currentProfile.id,
      display_name: currentProfile.display_name,
      color: myColor,
      shape: myShape,
      x: myPos.x,
      y: myPos.y,
    },
  ];

  const userCount = allUsers.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">Virtuelt rum — #{roomName}</span>
          <span className="text-xs text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-full">
            {userCount} {userCount === 1 ? "person" : "personer"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148,163,184,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        {allUsers.map((user) => {
          const isMe = user.user_id === currentProfile.id;
          const bubble = bubbles.get(user.user_id);
          return (
            <div
              key={user.user_id}
              style={{
                position: "absolute",
                left: `${user.x}%`,
                top: `${user.y}%`,
                transform: "translate(-50%, -50%)",
                cursor: isMe ? "grab" : "default",
                zIndex: isMe ? 10 : 5,
              }}
              onMouseDown={isMe ? startDrag : undefined}
              onTouchStart={isMe ? startDrag : undefined}
            >
              {/* Speech bubble */}
              {bubble && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 max-w-[140px] animate-fade-in"
                  style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}
                >
                  <div
                    className="text-xs text-white px-2.5 py-1.5 rounded-xl rounded-bl-none whitespace-pre-wrap break-words leading-snug"
                    style={{ backgroundColor: user.color }}
                  >
                    {bubble.text}
                  </div>
                  {/* Triangle pointer */}
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "7px solid transparent",
                      borderRight: "0px solid transparent",
                      borderTop: `7px solid ${user.color}`,
                      marginLeft: "10px",
                    }}
                  />
                </div>
              )}

              {/* Avatar */}
              <div
                style={{
                  filter: isMe
                    ? "drop-shadow(0 0 8px rgba(255,255,255,0.25))"
                    : "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                }}
              >
                <AvatarShape shape={user.shape} color={user.color} size={44} />
              </div>

              {/* Name label */}
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                >
                  {isMe ? "Du" : user.display_name}
                </span>
              </div>
            </div>
          );
        })}

        {/* Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-500 pointer-events-none select-none">
          Træk din avatar rundt
        </div>
      </div>

      {/* Chat input */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] bg-slate-900/60">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Skriv en besked..."
          className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
