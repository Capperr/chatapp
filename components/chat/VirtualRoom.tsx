"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Send } from "lucide-react";
import type { Profile } from "@/types";
import { UserProfileModal } from "./UserProfileModal";

const COLS = 12;
const ROWS = 9;
const TW = 86;   // tile width in SVG units
const TH = 43;   // tile height (2:1 isometric ratio)
const AR = 22;   // avatar radius
const OFFSET_Y = TH / 2 + 90;

const SVG_W = (Math.max(COLS, ROWS) + 1) * TW;
const SVG_H = (COLS + ROWS) * (TH / 2) + OFFSET_Y + TH * 2;

const SHAPES = ["circle", "square", "hexagon", "diamond", "triangle", "pentagon"] as const;
type ShapeType = typeof SHAPES[number];

function getShape(userId: string): ShapeType {
  const hash = userId.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return SHAPES[hash % SHAPES.length];
}

function isoCenter(gx: number, gy: number) {
  return {
    x: (gx - gy) * (TW / 2) + SVG_W / 2,
    y: (gx + gy) * (TH / 2) + OFFSET_Y,
  };
}

function tilePts(cx: number, cy: number): string {
  return `${cx},${cy - TH / 2} ${cx + TW / 2},${cy} ${cx},${cy + TH / 2} ${cx - TW / 2},${cy}`;
}

function polyPts(shape: ShapeType, r: number): string {
  const n =
    shape === "triangle" ? 3 :
    shape === "diamond" ? 4 :
    shape === "pentagon" ? 5 : 6;
  const off = shape === "hexagon" ? 30 : 0;
  return Array.from({ length: n }, (_, i) => {
    const a = ((i * 360) / n + off) * (Math.PI / 180);
    return `${r * Math.sin(a)},${-r * Math.cos(a)}`;
  }).join(" ");
}

interface PresenceUser {
  user_id: string;
  display_name: string;
  color: string;
  shape: ShapeType;
  gx: number;
  gy: number;
}

interface SpeechBubble { text: string; ts: number; }
interface CtxMenu { clientX: number; clientY: number; user: PresenceUser; }

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

  // `users` holds OTHER users' positions (from broadcast + presence)
  const [users, setUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [bubbles, setBubbles] = useState<Map<string, SpeechBubble>>(new Map());
  const [myPos, setMyPos] = useState({ gx: Math.floor(COLS / 2), gy: Math.floor(ROWS / 2) });
  const [input, setInput] = useState("");
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [profileView, setProfileView] = useState<Profile | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Broadcast own position (fast, ~50ms latency)
  const broadcastMove = useCallback((gx: number, gy: number) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "move",
      payload: {
        user_id: currentProfile.id,
        display_name: currentProfile.display_name,
        color: myColor,
        shape: myShape,
        gx,
        gy,
      } satisfies PresenceUser,
    });
  }, [currentProfile.id, currentProfile.display_name, myColor, myShape]);

  useEffect(() => {
    const ch = supabase.channel(`virtual-${roomId}`, {
      config: { presence: { key: currentProfile.id } },
    });
    channelRef.current = ch;

    const myData: PresenceUser = {
      user_id: currentProfile.id,
      display_name: currentProfile.display_name,
      color: myColor,
      shape: myShape,
      gx: myPos.gx,
      gy: myPos.gy,
    };

    ch
      // Presence: detect who is online (join/leave), seed initial positions
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState<PresenceUser>();
        setUsers((prev) => {
          const next = new Map(prev);
          // Add/update users found in presence (they might not have broadcast yet)
          for (const [, arr] of Object.entries(state)) {
            const p = arr[0] as PresenceUser;
            if (p?.user_id && p.user_id !== currentProfile.id) {
              if (!next.has(p.user_id)) next.set(p.user_id, p);
            }
          }
          // Remove users no longer in presence
          const activeIds = new Set(
            Object.values(state).map((arr) => (arr[0] as PresenceUser)?.user_id).filter(Boolean)
          );
          for (const uid of Array.from(next.keys())) {
            if (!activeIds.has(uid)) next.delete(uid);
          }
          return next;
        });
      })
      // Broadcast: instant position updates
      .on("broadcast", { event: "move" }, ({ payload }) => {
        const p = payload as PresenceUser;
        if (!p?.user_id || p.user_id === currentProfile.id) return;
        setUsers((prev) => {
          const next = new Map(prev);
          next.set(p.user_id, p);
          return next;
        });
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const sid: string = payload.new.user_id;
          const txt: string = payload.new.content;
          setBubbles((prev) => {
            const m = new Map(prev);
            m.set(sid, { text: txt, ts: Date.now() });
            return m;
          });
          setTimeout(() => {
            setBubbles((prev) => {
              const m = new Map(prev);
              const b = m.get(sid);
              if (b && Date.now() - b.ts >= 4900) m.delete(sid);
              return m;
            });
          }, 5000);
        }
      )
      .subscribe(() => {
        // Once subscribed, track presence (so others know we joined) and broadcast initial pos
        ch.track(myData);
        broadcastMove(myData.gx, myData.gy);
      });

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Close context menu on outside click
  useEffect(() => {
    const h = () => setCtxMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  const handleTileClick = (gx: number, gy: number) => {
    setCtxMenu(null);
    const blocked = Array.from(users.values()).some(
      (u) => u.user_id !== currentProfile.id && u.gx === gx && u.gy === gy
    );
    if (blocked) return;
    setMyPos({ gx, gy });
    broadcastMove(gx, gy);
  };

  const handleRightClick = (e: React.MouseEvent, user: PresenceUser | null) => {
    e.preventDefault();
    if (!user || user.user_id === currentProfile.id) return;
    setCtxMenu({ clientX: e.clientX, clientY: e.clientY, user });
  };

  const openProfile = async (userId: string) => {
    setCtxMenu(null);
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfileView(data as Profile);
  };

  const usersByCell = useMemo(() => {
    const m = new Map<string, PresenceUser>();
    Array.from(users.values()).forEach((u) => {
      if (u.user_id !== currentProfile.id) m.set(`${u.gx},${u.gy}`, u);
    });
    m.set(`${myPos.gx},${myPos.gy}`, {
      user_id: currentProfile.id,
      display_name: currentProfile.display_name,
      color: myColor,
      shape: myShape,
      gx: myPos.gx,
      gy: myPos.gy,
    });
    return m;
  }, [users, myPos, currentProfile.id, currentProfile.display_name, myColor, myShape]);

  // Painter's algorithm: render back-to-front (lowest gx+gy first)
  const sortedTiles = useMemo(() => {
    const tiles: { gx: number; gy: number }[] = [];
    for (let gy = 0; gy < ROWS; gy++)
      for (let gx = 0; gx < COLS; gx++)
        tiles.push({ gx, gy });
    return tiles.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
  }, []);

  const sendMessage = async () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    await supabase.from("messages").insert({
      content: t,
      user_id: currentProfile.id,
      room_id: roomId,
    });
  };

  const totalUsers = users.has(currentProfile.id) ? users.size : users.size + 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#080e1a]"
      onClick={() => setCtxMenu(null)}
    >
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

      {/* Isometric SVG canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%" }}
        >
          <rect width={SVG_W} height={SVG_H} fill="#080e1a" />

          {sortedTiles.map(({ gx, gy }) => {
            const { x, y } = isoCenter(gx, gy);
            const cellKey = `${gx},${gy}`;
            const cellUser = usersByCell.get(cellKey);
            const isMe = cellUser?.user_id === currentProfile.id;
            const bubble = cellUser ? bubbles.get(cellUser.user_id) : undefined;
            const isHov = hovered === cellKey && !cellUser;
            const isMyTile = myPos.gx === gx && myPos.gy === gy;

            const tileFill =
              isMyTile ? "#241a52" :
              isHov ? "#1a3050" :
              (gx + gy) % 2 === 0 ? "#111d31" : "#0d1726";

            const tileBorder = isMyTile ? myColor : "#1a2840";

            // Avatar sits above the top point of the tile
            const ax = x;
            const ay = y - TH / 2 - AR - 10;

            return (
              <g
                key={cellKey}
                onClick={() => handleTileClick(gx, gy)}
                onContextMenu={(e) => handleRightClick(e, cellUser ?? null)}
                onMouseEnter={() => setHovered(cellKey)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: (cellUser && !isMe) ? "default" : "pointer" }}
              >
                {/* Tile floor */}
                <polygon
                  points={tilePts(x, y)}
                  fill={tileFill}
                  stroke={tileBorder}
                  strokeWidth={isMyTile ? 1.5 : 0.8}
                />

                {/* Hover highlight */}
                {isHov && (
                  <polygon
                    points={tilePts(x, y)}
                    fill="rgba(100,160,255,0.07)"
                    stroke="rgba(100,160,255,0.3)"
                    strokeWidth={1}
                  />
                )}

                {/* Avatar + label */}
                {cellUser && (
                  <g>
                    {/* Drop shadow */}
                    <ellipse
                      cx={ax}
                      cy={y - TH / 2 + 7}
                      rx={18}
                      ry={6}
                      fill="rgba(0,0,0,0.45)"
                    />

                    {/* Avatar shape */}
                    <g transform={`translate(${ax}, ${ay})`}>
                      {cellUser.shape === "circle" && (
                        <circle cx={0} cy={0} r={AR} fill={cellUser.color} stroke="white" strokeWidth={2.5} />
                      )}
                      {cellUser.shape === "square" && (
                        <rect
                          x={-AR * 0.85}
                          y={-AR * 0.85}
                          width={AR * 1.7}
                          height={AR * 1.7}
                          rx={5}
                          fill={cellUser.color}
                          stroke="white"
                          strokeWidth={2.5}
                        />
                      )}
                      {!["circle", "square"].includes(cellUser.shape) && (
                        <polygon
                          points={polyPts(cellUser.shape, AR)}
                          fill={cellUser.color}
                          stroke="white"
                          strokeWidth={2.5}
                        />
                      )}

                      {/* Glow ring for own avatar */}
                      {isMe && (
                        <circle
                          cx={0}
                          cy={0}
                          r={AR + 8}
                          fill="none"
                          stroke={cellUser.color}
                          strokeWidth={1.5}
                          opacity={0.35}
                          strokeDasharray="5 3"
                        />
                      )}
                    </g>

                    {/* Name label — double-rendered for outline effect */}
                    <text
                      x={ax}
                      y={ay + AR + 17}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="system-ui, sans-serif"
                      fontWeight="600"
                      stroke="rgba(0,0,0,0.95)"
                      strokeWidth={3}
                      fill="rgba(0,0,0,0.95)"
                    >
                      {isMe ? "Du" : cellUser.display_name}
                    </text>
                    <text
                      x={ax}
                      y={ay + AR + 17}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="system-ui, sans-serif"
                      fontWeight="600"
                      fill="white"
                    >
                      {isMe ? "Du" : cellUser.display_name}
                    </text>

                    {/* Speech bubble */}
                    {bubble && (() => {
                      const chPerLine = 18;
                      const words = bubble.text.split(" ");
                      const lines: string[] = [];
                      let cur = "";
                      words.forEach((w) => {
                        const next = cur ? `${cur} ${w}` : w;
                        if (next.length > chPerLine && cur) {
                          lines.push(cur);
                          cur = w;
                        } else {
                          cur = next;
                        }
                      });
                      if (cur) lines.push(cur);
                      const capped = lines.slice(0, 3);
                      const bw = Math.min(145, Math.max(55, capped[0].length * 6.2 + 22));
                      const bh = capped.length * 15 + 12;
                      const bTop = ay - AR - 14 - bh;

                      return (
                        <g>
                          <rect
                            x={ax - bw / 2}
                            y={bTop}
                            width={bw}
                            height={bh}
                            rx={8}
                            fill={cellUser.color}
                            opacity={0.95}
                          />
                          {/* Bubble tail */}
                          <polygon
                            points={`${ax - 5},${bTop + bh} ${ax + 5},${bTop + bh} ${ax},${bTop + bh + 8}`}
                            fill={cellUser.color}
                            opacity={0.95}
                          />
                          {capped.map((line, i) => (
                            <text
                              key={i}
                              x={ax}
                              y={bTop + 14 + i * 15}
                              textAnchor="middle"
                              fontSize={9.5}
                              fontFamily="system-ui, sans-serif"
                              fontWeight="500"
                              fill="white"
                            >
                              {line}
                            </text>
                          ))}
                        </g>
                      );
                    })()}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          className="fixed z-[60] bg-slate-800 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden min-w-[170px]"
          style={{ left: ctxMenu.clientX, top: ctxMenu.clientY }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex-shrink-0"
              style={{ backgroundColor: ctxMenu.user.color }}
            />
            <span className="text-xs font-semibold text-slate-200 truncate">
              {ctxMenu.user.display_name}
            </span>
          </div>
          <button
            className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] transition-colors"
            onClick={() => openProfile(ctxMenu.user.user_id)}
          >
            Se profil
          </button>
        </div>
      )}

      {/* Profile modal */}
      {profileView && (
        <UserProfileModal
          profile={profileView}
          currentProfile={currentProfile}
          onClose={() => setProfileView(null)}
        />
      )}

      {/* Chat input */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] bg-slate-900/60">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
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
