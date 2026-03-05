"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Send } from "lucide-react";
import type { Profile } from "@/types";

const COLS = 14;
const ROWS = 9;

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

function AvatarShape({ shape, color, size = 34 }: { shape: ShapeType; color: string; size?: number }) {
  const r = size / 2 - 3;
  const c = size / 2;
  if (shape === "circle") {
    return (
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={c} cy={c} r={r} fill={color} stroke="white" strokeWidth={2} />
      </svg>
    );
  }
  if (shape === "square") {
    return (
      <svg width={size} height={size} style={{ display: "block" }}>
        <rect x={3} y={3} width={size - 6} height={size - 6} rx={4} fill={color} stroke="white" strokeWidth={2} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <polygon points={shapePoints(shape, c, c, r)} fill={color} stroke="white" strokeWidth={2} />
    </svg>
  );
}

interface PresenceUser {
  user_id: string;
  display_name: string;
  color: string;
  shape: ShapeType;
  gx: number;
  gy: number;
}

interface SpeechBubble {
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const myShape = getShape(currentProfile.id);
  const myColor = currentProfile.avatar_color ?? "#8b5cf6";

  const [users, setUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [bubbles, setBubbles] = useState<Map<string, SpeechBubble>>(new Map());
  const [myPos, setMyPos] = useState({ gx: Math.floor(COLS / 2), gy: Math.floor(ROWS / 2) });
  const [input, setInput] = useState("");

  const trackPresence = useCallback(
    (gx: number, gy: number) => {
      channelRef.current?.track({
        user_id: currentProfile.id,
        display_name: currentProfile.display_name,
        color: myColor,
        shape: myShape,
        gx,
        gy,
      } satisfies PresenceUser);
    },
    [currentProfile.id, currentProfile.display_name, myColor, myShape]
  );

  const handleCellClick = (gx: number, gy: number) => {
    const occupiedByOther = Array.from(users.values()).some(
      (u) => u.user_id !== currentProfile.id && u.gx === gx && u.gy === gy
    );
    if (occupiedByOther) return;
    setMyPos({ gx, gy });
    trackPresence(gx, gy);
  };

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
        (payload) => {
          const senderId: string = payload.new.user_id;
          const content: string = payload.new.content;
          setBubbles((prev) => {
            const next = new Map(prev);
            next.set(senderId, { text: content, ts: Date.now() });
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

    trackPresence(myPos.gx, myPos.gy);

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

  // Build cell → user lookup
  const usersByCell = new Map<string, PresenceUser>();
  Array.from(users.values()).forEach((u) => {
    if (u.user_id !== currentProfile.id) usersByCell.set(`${u.gx},${u.gy}`, u);
  });
  usersByCell.set(`${myPos.gx},${myPos.gy}`, {
    user_id: currentProfile.id,
    display_name: currentProfile.display_name,
    color: myColor,
    shape: myShape,
    gx: myPos.gx,
    gy: myPos.gy,
  });

  const totalUsers = users.has(currentProfile.id) ? users.size : users.size + 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">Virtuelt rum — #{roomName}</span>
          <span className="text-xs text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-full">
            {totalUsers} {totalUsers === 1 ? "person" : "personer"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Room */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div
          className="relative rounded-xl border-2 border-slate-700 overflow-hidden shadow-2xl"
          style={{
            width: "min(92vw, calc((100vh - 140px) * 14 / 9))",
            aspectRatio: `${COLS} / ${ROWS}`,
            background: "linear-gradient(160deg, #1a2744 0%, #0d1b2a 60%, #111827 100%)",
          }}
        >
          {/* Floor grid lines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px),
                linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)
              `,
              backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
            }}
          />

          {/* Cells grid */}
          <div
            className="absolute inset-0"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            }}
          >
            {Array.from({ length: ROWS }, (_, gy) =>
              Array.from({ length: COLS }, (_, gx) => {
                const cellUser = usersByCell.get(`${gx},${gy}`);
                const isMe = cellUser?.user_id === currentProfile.id;
                const bubble = cellUser ? bubbles.get(cellUser.user_id) : undefined;
                const blockedByOther = cellUser && !isMe;

                return (
                  <div
                    key={`${gx}-${gy}`}
                    onClick={() => handleCellClick(gx, gy)}
                    className={[
                      "relative flex items-center justify-center transition-colors duration-100",
                      !cellUser
                        ? "hover:bg-white/[0.05] cursor-pointer active:bg-white/[0.09]"
                        : blockedByOther
                        ? "cursor-default"
                        : "cursor-default",
                    ].join(" ")}
                  >
                    {/* Highlight own cell */}
                    {isMe && (
                      <div
                        className="absolute inset-0 rounded-sm"
                        style={{ backgroundColor: `${myColor}22`, border: `1px solid ${myColor}55` }}
                      />
                    )}

                    {cellUser && (
                      <div className="relative z-10 flex flex-col items-center" style={{ gap: "1px" }}>
                        {/* Speech bubble */}
                        {bubble && (
                          <div
                            className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 pointer-events-none z-20"
                            style={{
                              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
                              minWidth: "60px",
                              maxWidth: "110px",
                            }}
                          >
                            <div
                              className="text-white px-2 py-1 rounded-lg rounded-bl-none break-words leading-snug text-center"
                              style={{
                                backgroundColor: cellUser.color,
                                fontSize: "9px",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {bubble.text}
                            </div>
                            <div
                              style={{
                                width: 0,
                                height: 0,
                                borderLeft: "5px solid transparent",
                                borderRight: 0,
                                borderTop: `5px solid ${cellUser.color}`,
                                marginLeft: "10px",
                              }}
                            />
                          </div>
                        )}

                        {/* Avatar */}
                        <div
                          style={{
                            filter: isMe
                              ? `drop-shadow(0 0 5px ${myColor}88)`
                              : "drop-shadow(0 2px 3px rgba(0,0,0,0.7))",
                          }}
                        >
                          <AvatarShape shape={cellUser.shape} color={cellUser.color} size={30} />
                        </div>

                        {/* Name */}
                        <span
                          style={{
                            fontSize: "8px",
                            color: "white",
                            backgroundColor: "rgba(0,0,0,0.65)",
                            padding: "1px 4px",
                            borderRadius: "3px",
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            lineHeight: 1.4,
                          }}
                        >
                          {isMe ? "Du" : cellUser.display_name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Chat input */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] bg-slate-900/60">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          placeholder="Skriv en besked — vises som taleboble over din avatar..."
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
