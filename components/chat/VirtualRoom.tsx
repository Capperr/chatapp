"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Send, Users, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import type { Profile } from "@/types";
import { UserProfileModal } from "./UserProfileModal";

// --- Grid constants ---
const COLS = 10;
const ROWS = 8;
const TW = 80;
const TH = 40;
const AR = 20;
const OFFSET_Y = TH / 2 + 80;
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
  const n = shape === "triangle" ? 3 : shape === "diamond" ? 4 : shape === "pentagon" ? 5 : 6;
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
interface LogMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: { display_name: string; avatar_color: string | null } | { display_name: string; avatar_color: string | null }[] | null;
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
  const chatLogRef = useRef<HTMLDivElement>(null);

  const myShape = getShape(currentProfile.id);
  const myColor = currentProfile.avatar_color ?? "#8b5cf6";

  const [users, setUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [bubbles, setBubbles] = useState<Map<string, SpeechBubble>>(new Map());
  const [myPos, setMyPos] = useState({ gx: Math.floor(COLS / 2), gy: Math.floor(ROWS / 2) });
  const [input, setInput] = useState("");
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [profileView, setProfileView] = useState<Profile | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [fullscreen, setFullscreen] = useState(false);

  // Fetch recent messages for chat log
  useEffect(() => {
    supabase
      .from("messages")
      .select("id, content, user_id, created_at, profiles(display_name, avatar_color)")
      .eq("room_id", roomId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setLogMessages((data as LogMessage[]).reverse());
      });
  }, [roomId]);

  // Auto-scroll chat log
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [logMessages]);

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
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState<PresenceUser>();
        setUsers((prev) => {
          const next = new Map(prev);
          for (const [, arr] of Object.entries(state)) {
            const p = arr[0] as PresenceUser;
            if (p?.user_id && p.user_id !== currentProfile.id && !next.has(p.user_id))
              next.set(p.user_id, p);
          }
          const activeIds = new Set(
            Object.values(state).map((arr) => (arr[0] as PresenceUser)?.user_id).filter(Boolean)
          );
          for (const uid of Array.from(next.keys())) {
            if (!activeIds.has(uid)) next.delete(uid);
          }
          return next;
        });
      })
      .on("broadcast", { event: "move" }, ({ payload }) => {
        const p = payload as PresenceUser;
        if (!p?.user_id || p.user_id === currentProfile.id) return;
        setUsers((prev) => { const m = new Map(prev); m.set(p.user_id, p); return m; });
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const sid: string = payload.new.user_id;
          const txt: string = payload.new.content;
          // Speech bubble
          setBubbles((prev) => { const m = new Map(prev); m.set(sid, { text: txt, ts: Date.now() }); return m; });
          setTimeout(() => {
            setBubbles((prev) => { const m = new Map(prev); const b = m.get(sid); if (b && Date.now() - b.ts >= 4900) m.delete(sid); return m; });
          }, 5000);
          // Fetch with profile for chat log
          const { data } = await supabase
            .from("messages")
            .select("id, content, user_id, created_at, profiles(display_name, avatar_color)")
            .eq("id", payload.new.id)
            .single();
          if (data) setLogMessages((prev) => [...prev.slice(-49), data as LogMessage]);
        }
      )
      .subscribe(() => {
        ch.track(myData);
        broadcastMove(myData.gx, myData.gy);
      });

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    const h = () => setCtxMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  const handleTileClick = (gx: number, gy: number) => {
    setCtxMenu(null);
    if (Array.from(users.values()).some((u) => u.user_id !== currentProfile.id && u.gx === gx && u.gy === gy)) return;
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

  const sendMessage = async () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    await supabase.from("messages").insert({ content: t, user_id: currentProfile.id, room_id: roomId });
  };

  const usersByCell = useMemo(() => {
    const m = new Map<string, PresenceUser>();
    Array.from(users.values()).forEach((u) => { if (u.user_id !== currentProfile.id) m.set(`${u.gx},${u.gy}`, u); });
    m.set(`${myPos.gx},${myPos.gy}`, { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, shape: myShape, gx: myPos.gx, gy: myPos.gy });
    return m;
  }, [users, myPos, currentProfile.id, currentProfile.display_name, myColor, myShape]);

  const sortedTiles = useMemo(() => {
    const t: { gx: number; gy: number }[] = [];
    for (let gy = 0; gy < ROWS; gy++) for (let gx = 0; gx < COLS; gx++) t.push({ gx, gy });
    return t.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
  }, []);

  const totalUsers = users.has(currentProfile.id) ? users.size : users.size + 1;

  const windowStyle = fullscreen
    ? { width: "100vw", height: "100vh", borderRadius: "0" }
    : { width: "min(96vw, 1040px)", height: "min(88vh, 660px)" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={() => setCtxMenu(null)}
    >
      {/* Window */}
      <div
        className="flex flex-col rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden bg-[#0a1220]"
        style={windowStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#07101c] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100">#{roomName}</span>
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              {totalUsers} online
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setFullscreen((f) => !f)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
              title={fullscreen ? "Minimér" : "Fuld skærm"}
            >
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Body: chat log left + isometric room right ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left panel — chat log */}
          <div className="w-56 flex-shrink-0 flex flex-col bg-[#07101c]/60 border-r border-white/[0.06]">
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Chatlog</span>
            </div>
            <div ref={chatLogRef} className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5">
              {logMessages.length === 0 && (
                <p className="text-[11px] text-slate-600 text-center mt-4">Ingen beskeder endnu</p>
              )}
              {logMessages.map((msg) => {
                const p = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
                const name = p?.display_name ?? "?";
                const color = p?.avatar_color ?? "#8b5cf6";
                const isMe = msg.user_id === currentProfile.id;
                return (
                  <div key={msg.id} className="text-[11px] leading-snug">
                    <span className="font-semibold" style={{ color }}>{isMe ? "Du" : name}: </span>
                    <span className="text-slate-300 break-words">{msg.content}</span>
                  </div>
                );
              })}
            </div>
            {/* Chat input */}
            <div className="border-t border-white/[0.06] p-2 flex gap-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Skriv besked..."
                className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500/50 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white flex-shrink-0"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right — isometric room */}
          <div className="flex-1 flex items-center justify-center overflow-hidden bg-[#080e1a]">
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
                  isMyTile ? "#231850" :
                  isHov ? "#192e4a" :
                  (gx + gy) % 2 === 0 ? "#0f1a2e" : "#0c1525";

                const ax = x;
                const ay = y - TH / 2 - AR - 8;

                return (
                  <g
                    key={cellKey}
                    onClick={() => handleTileClick(gx, gy)}
                    onContextMenu={(e) => handleRightClick(e, cellUser ?? null)}
                    onMouseEnter={() => setHovered(cellKey)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: (cellUser && !isMe) ? "default" : "pointer" }}
                  >
                    <polygon
                      points={tilePts(x, y)}
                      fill={tileFill}
                      stroke={isMyTile ? myColor : "#16243a"}
                      strokeWidth={isMyTile ? 1.5 : 0.7}
                    />
                    {isHov && (
                      <polygon
                        points={tilePts(x, y)}
                        fill="rgba(80,140,255,0.08)"
                        stroke="rgba(80,140,255,0.25)"
                        strokeWidth={0.8}
                      />
                    )}

                    {cellUser && (
                      <g>
                        <ellipse cx={ax} cy={y - TH / 2 + 6} rx={16} ry={5} fill="rgba(0,0,0,0.45)" />
                        <g transform={`translate(${ax}, ${ay})`}>
                          {cellUser.shape === "circle" && (
                            <circle cx={0} cy={0} r={AR} fill={cellUser.color} stroke="white" strokeWidth={2.5} />
                          )}
                          {cellUser.shape === "square" && (
                            <rect x={-AR * 0.85} y={-AR * 0.85} width={AR * 1.7} height={AR * 1.7} rx={4} fill={cellUser.color} stroke="white" strokeWidth={2.5} />
                          )}
                          {!["circle", "square"].includes(cellUser.shape) && (
                            <polygon points={polyPts(cellUser.shape, AR)} fill={cellUser.color} stroke="white" strokeWidth={2.5} />
                          )}
                          {isMe && (
                            <circle cx={0} cy={0} r={AR + 7} fill="none" stroke={cellUser.color} strokeWidth={1.5} opacity={0.3} strokeDasharray="5 3" />
                          )}
                        </g>

                        {/* Name — double-pass for outline */}
                        <text x={ax} y={ay + AR + 15} textAnchor="middle" fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="700" stroke="rgba(0,0,0,0.95)" strokeWidth={3} fill="rgba(0,0,0,0.95)">
                          {isMe ? "Du" : cellUser.display_name}
                        </text>
                        <text x={ax} y={ay + AR + 15} textAnchor="middle" fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="700" fill="white">
                          {isMe ? "Du" : cellUser.display_name}
                        </text>

                        {/* Speech bubble */}
                        {bubble && (() => {
                          const chPerLine = 16;
                          const words = bubble.text.split(" ");
                          const lines: string[] = [];
                          let cur = "";
                          words.forEach((w) => {
                            const next = cur ? `${cur} ${w}` : w;
                            if (next.length > chPerLine && cur) { lines.push(cur); cur = w; } else { cur = next; }
                          });
                          if (cur) lines.push(cur);
                          const capped = lines.slice(0, 3);
                          const bw = Math.min(130, Math.max(50, capped[0].length * 6 + 20));
                          const bh = capped.length * 14 + 10;
                          const bTop = ay - AR - 12 - bh;
                          return (
                            <g>
                              <rect x={ax - bw / 2} y={bTop} width={bw} height={bh} rx={7} fill={cellUser.color} opacity={0.95} />
                              <polygon points={`${ax - 4},${bTop + bh} ${ax + 4},${bTop + bh} ${ax},${bTop + bh + 7}`} fill={cellUser.color} opacity={0.95} />
                              {capped.map((line, i) => (
                                <text key={i} x={ax} y={bTop + 13 + i * 14} textAnchor="middle" fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="500" fill="white">{line}</text>
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
        </div>

        {/* ── Bottom toolbar ── */}
        <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-[#07101c] border-t border-white/[0.06]">
          <button
            onClick={() => broadcastMove(myPos.gx, myPos.gy)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
            title="Genopfrisk position"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
            title="Brugere online"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1" />
          <span className="text-[11px] text-slate-600">
            Klik på en flade for at bevæge dig · Højreklik på en avatar for muligheder
          </span>
        </div>
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          className="fixed z-[60] bg-slate-800 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden min-w-[170px]"
          style={{ left: ctxMenu.clientX, top: ctxMenu.clientY }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: ctxMenu.user.color }} />
            <span className="text-xs font-semibold text-slate-200 truncate">{ctxMenu.user.display_name}</span>
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
    </div>
  );
}
