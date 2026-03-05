"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Users, Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut, Hash, Wrench, Plus, Trash2, Pencil, Package, Minus } from "lucide-react";
import type { Profile } from "@/types";
import { UserProfileModal } from "./UserProfileModal";

// ─── Grid constants ────────────────────────────────────────────────────────────
const TW = 80;
const TH = 40;
const AR = 20;
const AVG_SCALE = 1.4;
const AR_S = Math.round(AR * AVG_SCALE); // 28 – scaled avatar half-height
const OFFSET_Y = TH / 2 + 80;
const DEFAULT_COLS = 10;
const DEFAULT_ROWS = 8;

// ─── Room themes ───────────────────────────────────────────────────────────────
function getRoomTheme(roomName: string): { even: string; odd: string; highlight: string } {
  const n = roomName.toLowerCase();
  if (n.includes("køkken") || n.includes("kitchen"))
    return { even: "#1a2010", odd: "#161d0e", highlight: "#2e3d10" };
  if (n.includes("stue") || n.includes("living"))
    return { even: "#12181f", odd: "#0f1419", highlight: "#1a2d3a" };
  if (n.includes("soveværelse") || n.includes("bedroom") || n.includes("sove"))
    return { even: "#1a1020", odd: "#15091a", highlight: "#2e1045" };
  if (n.includes("bad") || n.includes("bathroom") || n.includes("toilet"))
    return { even: "#0e1e22", odd: "#0b181c", highlight: "#0e2e38" };
  if (n.includes("kontor") || n.includes("office"))
    return { even: "#1a1510", odd: "#14100c", highlight: "#2e2010" };
  return { even: "#0f1a2e", odd: "#0c1525", highlight: "#231850" };
}

// ─── Person Avatar ─────────────────────────────────────────────────────────────
function PersonAvatar({ color, glow, mood = "happy" }: { color: string; glow?: boolean; mood?: string }) {
  const skin = "#f5c5a3";
  const face = (() => {
    switch (mood) {
      case "sad":
        return (
          <g>
            <circle cx="-3" cy="-13" r="1.3" fill="#2d1b0e" />
            <circle cx="3" cy="-13" r="1.3" fill="#2d1b0e" />
            <ellipse cx="-2.5" cy="-10" rx="0.7" ry="1.1" fill="#93c5fd" opacity="0.85" />
            <path d="M -2.5,-7.5 Q 0,-9.5 2.5,-7.5" stroke="#b07848" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          </g>
        );
      case "angry":
        return (
          <g>
            <line x1="-5.5" y1="-17" x2="-1" y2="-14.5" stroke="#2d1b0e" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="5.5" y1="-17" x2="1" y2="-14.5" stroke="#2d1b0e" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="-3" cy="-12.5" r="1.3" fill="#2d1b0e" />
            <circle cx="3" cy="-12.5" r="1.3" fill="#2d1b0e" />
            <path d="M -2.5,-8 Q 0,-6.5 2.5,-8" stroke="#b07848" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          </g>
        );
      case "tired":
        return (
          <g>
            <circle cx="-3" cy="-13" r="1.3" fill="#2d1b0e" />
            <circle cx="3" cy="-13" r="1.3" fill="#2d1b0e" />
            <path d="M -4.8,-13 Q -3,-15 -1.2,-13" fill={skin} stroke="none" />
            <path d="M 1.2,-13 Q 3,-15 4.8,-13" fill={skin} stroke="none" />
            <text x="6" y="-16" fontSize="4.5" fill="#94a3b8" fontFamily="system-ui">zzz</text>
            <path d="M -2,-8.5 L 2,-8.5" stroke="#b07848" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          </g>
        );
      default:
        return (
          <g>
            <circle cx="-3" cy="-13" r="1.3" fill="#2d1b0e" />
            <circle cx="3" cy="-13" r="1.3" fill="#2d1b0e" />
            <path d="M -2.5,-9.5 Q 0,-7.5 2.5,-9.5" stroke="#b07848" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          </g>
        );
    }
  })();
  return (
    <g>
      {glow && <circle cx="0" cy="0" r="22" fill="none" stroke={color} strokeWidth="1.5" opacity={0.3} strokeDasharray="5 3" />}
      <ellipse cx="0" cy="-19" rx="7.5" ry="5" fill={color} stroke="white" strokeWidth="0.8" />
      <circle cx="0" cy="-12" r="8" fill={skin} stroke="white" strokeWidth="0.9" />
      {face}
      <rect x="-8" y="-4" width="16" height="13" rx="3" fill={color} stroke="white" strokeWidth="0.8" />
      <rect x="-13" y="-4" width="5" height="10" rx="2.5" fill={color} stroke="white" strokeWidth="0.7" />
      <rect x="8" y="-4" width="5" height="10" rx="2.5" fill={color} stroke="white" strokeWidth="0.7" />
      <circle cx="-10.5" cy="7" r="2.5" fill={skin} stroke="white" strokeWidth="0.6" />
      <circle cx="10.5" cy="7" r="2.5" fill={skin} stroke="white" strokeWidth="0.6" />
      <rect x="-7.5" y="9" width="6" height="10" rx="2" fill="#374151" stroke="white" strokeWidth="0.7" />
      <rect x="1.5" y="9" width="6" height="10" rx="2" fill="#374151" stroke="white" strokeWidth="0.7" />
      <ellipse cx="-4.5" cy="20" rx="5.5" ry="2.5" fill="#1f2937" stroke="white" strokeWidth="0.6" />
      <ellipse cx="4.5" cy="20" rx="5.5" ry="2.5" fill="#1f2937" stroke="white" strokeWidth="0.6" />
    </g>
  );
}

// ─── Mood config ───────────────────────────────────────────────────────────────
const MOODS = [
  { id: "happy",  label: "Glad",  emoji: "😊" },
  { id: "sad",    label: "Trist", emoji: "😢" },
  { id: "angry",  label: "Sur",   emoji: "😠" },
  { id: "tired",  label: "Træt",  emoji: "😴" },
] as const;

// ─── Item SVGs ─────────────────────────────────────────────────────────────────
function FlowerSVG() {
  return (
    <g>
      <line x1="0" y1="8" x2="0" y2="-3" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
      <circle cx="-4" cy="-7" r="3.5" fill="#fb7185" />
      <circle cx="4" cy="-7" r="3.5" fill="#fb7185" />
      <circle cx="0" cy="-11" r="3.5" fill="#fb7185" />
      <circle cx="-3" cy="-2" r="3.5" fill="#fb7185" />
      <circle cx="3" cy="-2" r="3.5" fill="#fb7185" />
      <circle cx="0" cy="-6" r="3.5" fill="#fde047" />
    </g>
  );
}
function TVSVG() {
  return (
    <g>
      <rect x="-11" y="-9" width="22" height="16" rx="2" fill="#1f2937" />
      <rect x="-9" y="-7" width="18" height="12" rx="1" fill="#1d4ed8" />
      <line x1="-7" y1="-5" x2="-3" y2="-1" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="-2" y="7" width="4" height="3" rx="1" fill="#374151" />
      <rect x="-6" y="10" width="12" height="2" rx="1" fill="#374151" />
    </g>
  );
}
function DeskSVG() {
  return (
    <g>
      <rect x="-13" y="-7" width="26" height="4" rx="2" fill="#92400e" />
      <rect x="-11" y="-3" width="3" height="14" rx="1" fill="#78350f" />
      <rect x="8" y="-3" width="3" height="14" rx="1" fill="#78350f" />
      <rect x="-9" y="4" width="18" height="3" rx="1" fill="#92400e" opacity="0.7" />
    </g>
  );
}
function MailboxSVG() {
  return (
    <g>
      <rect x="-1.5" y="-4" width="3" height="16" rx="1" fill="#6b7280" />
      <rect x="-9" y="-10" width="18" height="12" rx="2" fill="#dc2626" />
      <path d="M-9,-10 Q0,-17 9,-10" fill="#b91c1c" />
      <rect x="8" y="-12" width="2" height="8" fill="#6b7280" />
      <rect x="10" y="-12" width="6" height="4" fill="#dc2626" />
      <rect x="-6" y="-4" width="10" height="2" rx="0.5" fill="#fca5a5" />
    </g>
  );
}
function CoffeeSVG() {
  return (
    <g>
      <path d="M-3,-10 Q-6,-14 -3,-18" fill="none" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M3,-10 Q6,-14 3,-18" fill="none" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <rect x="-7" y="-9" width="14" height="12" rx="2" fill="#f97316" />
      <rect x="-5" y="-7" width="10" height="8" rx="1" fill="#7c2d12" opacity="0.8" />
      <path d="M7,-5 Q12,-5 12,-1 Q12,3 7,3" fill="none" stroke="#f97316" strokeWidth="2" />
      <ellipse cx="0" cy="3" rx="9" ry="2" fill="#e5e7eb" />
    </g>
  );
}
function SofaSVG() {
  return (
    <g>
      <rect x="-14" y="-2" width="28" height="10" rx="3" fill="#4f46e5" />
      <rect x="-14" y="-10" width="28" height="10" rx="3" fill="#4338ca" />
      <rect x="-16" y="-10" width="6" height="18" rx="3" fill="#4338ca" />
      <rect x="10" y="-10" width="6" height="18" rx="3" fill="#4338ca" />
      <line x1="0" y1="-9" x2="0" y2="8" stroke="#6d61f0" strokeWidth="1" opacity="0.5" />
    </g>
  );
}

const ITEM_TYPES = [
  { type: "flower",  label: "Blomst",     color: "#fb7185" },
  { type: "tv",      label: "TV",         color: "#1d4ed8" },
  { type: "desk",    label: "Skrivebord", color: "#92400e" },
  { type: "mailbox", label: "Postkasse",  color: "#dc2626" },
  { type: "coffee",  label: "Kaffe",      color: "#f97316" },
  { type: "sofa",    label: "Sofa",       color: "#4f46e5" },
];

function ItemSVG({ type }: { type: string }) {
  switch (type) {
    case "flower":  return <FlowerSVG />;
    case "tv":      return <TVSVG />;
    case "desk":    return <DeskSVG />;
    case "mailbox": return <MailboxSVG />;
    case "coffee":  return <CoffeeSVG />;
    case "sofa":    return <SofaSVG />;
    default: return <circle r="8" fill="#6b7280" />;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function isoCenter(gx: number, gy: number, svgW: number) {
  return {
    x: (gx - gy) * (TW / 2) + svgW / 2,
    y: (gx + gy) * (TH / 2) + OFFSET_Y,
  };
}
function tilePts(cx: number, cy: number): string {
  return `${cx},${cy - TH / 2} ${cx + TW / 2},${cy} ${cx},${cy + TH / 2} ${cx - TW / 2},${cy}`;
}

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface PresenceUser {
  user_id: string;
  display_name: string;
  color: string;
  gx: number;
  gy: number;
  mood?: string;
}
interface SpeechBubble { text: string; ts: number; }
interface CtxMenu {
  clientX: number;
  clientY: number;
  kind: "user" | "self" | "tile_item";
  user?: PresenceUser;
  item?: RoomItem;
}
interface LogMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: { display_name: string; avatar_color: string | null } | { display_name: string; avatar_color: string | null }[] | null;
}
interface RoomItem {
  id: string;
  room_id: string;
  name: string;
  item_type: string;
  item_scale: number;
  gx: number | null;
  gy: number | null;
  owner_id: string | null;
}
interface GlobalUser {
  user_id: string;
  display_name: string;
  color: string;
  room_id: string;
  room_name: string;
}
interface ChatRoom {
  id: string;
  name: string;
  cols: number;
  rows: number;
}
interface VirtualRoomProps {
  roomId: string;
  roomName: string;
  currentProfile: Profile;
  onClose: () => void;
}
type RightPanel = "chatlog" | "rooms" | "admin" | "inventory" | "online";

// ─── Component ─────────────────────────────────────────────────────────────────
export function VirtualRoom({ roomId, roomName, currentProfile, onClose }: VirtualRoomProps) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const globalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const myPosRef = useRef({ gx: Math.floor(Math.random() * DEFAULT_COLS), gy: Math.floor(Math.random() * DEFAULT_ROWS) });
  const lastActivityRef = useRef(Date.now());
  const myMoodRef = useRef("happy");
  const draftRef = useRef("");
  const sendDraftRef = useRef<() => void>(() => {});
  const roomColsRef = useRef(DEFAULT_COLS);
  const roomRowsRef = useRef(DEFAULT_ROWS);

  const myColor = currentProfile.avatar_color ?? "#8b5cf6";
  const isAdmin = currentProfile.role === "admin";

  const [activeRoomId, setActiveRoomId] = useState(roomId);
  const [activeRoomName, setActiveRoomName] = useState(roomName);
  const [roomCols, setRoomCols] = useState(DEFAULT_COLS);
  const [roomRows, setRoomRows] = useState(DEFAULT_ROWS);
  const [users, setUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [bubbles, setBubbles] = useState<Map<string, SpeechBubble>>(new Map());
  const [myPos, setMyPos] = useState(myPosRef.current);
  const [myMood, setMyMood] = useState("happy");
  const [draft, setDraft] = useState("");
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [profileView, setProfileView] = useState<Profile | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rightPanel, setRightPanel] = useState<RightPanel>("chatlog");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [createForm, setCreateForm] = useState<{ name: string; item_type: string } | null>(null);
  const [editItem, setEditItem] = useState<RoomItem | null>(null);
  const [globalUsers, setGlobalUsers] = useState<Map<string, GlobalUser>>(new Map());
  const [createRoomForm, setCreateRoomForm] = useState<{ name: string; cols: number; rows: number } | null>(null);

  // Derived SVG dimensions
  const svgW = useMemo(() => (Math.max(roomCols, roomRows) + 1) * TW, [roomCols, roomRows]);
  const svgH = useMemo(() => (roomCols + roomRows) * (TH / 2) + OFFSET_Y + TH * 2, [roomCols, roomRows]);

  const setRoomDimensions = (cols: number, rows: number) => {
    roomColsRef.current = cols;
    roomRowsRef.current = rows;
    setRoomCols(cols);
    setRoomRows(rows);
  };

  const moveMyPos = useCallback((gx: number, gy: number) => {
    myPosRef.current = { gx, gy };
    setMyPos({ gx, gy });
    lastActivityRef.current = Date.now();
  }, []);

  const changeMood = (mood: string) => {
    myMoodRef.current = mood;
    setMyMood(mood);
    channelRef.current?.send({
      type: "broadcast",
      event: "move",
      payload: { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: myPosRef.current.gx, gy: myPosRef.current.gy, mood } satisfies PresenceUser,
    });
  };

  // Fetch rooms list
  useEffect(() => {
    supabase.from("chat_rooms").select("id, name, cols, rows").order("name").then(({ data }) => {
      if (data) {
        const list = (data as ChatRoom[]).map(r => ({ ...r, cols: r.cols ?? DEFAULT_COLS, rows: r.rows ?? DEFAULT_ROWS }));
        setRooms(list);
        const cur = list.find(r => r.id === roomId);
        if (cur) setRoomDimensions(cur.cols, cur.rows);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global presence — tracks all users across all rooms
  useEffect(() => {
    const globalCh = supabase.channel("virtual-global", { config: { presence: { key: currentProfile.id } } });
    globalChannelRef.current = globalCh;
    globalCh
      .on("presence", { event: "sync" }, () => {
        const state = globalCh.presenceState<GlobalUser>();
        const all = new Map<string, GlobalUser>();
        for (const arr of Object.values(state)) {
          const p = arr[0] as GlobalUser;
          if (p?.user_id) all.set(p.user_id, p);
        }
        setGlobalUsers(all);
      })
      .subscribe(() => {
        globalCh.track({ user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, room_id: activeRoomId, room_name: activeRoomName });
      });
    return () => { supabase.removeChannel(globalCh); globalChannelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-track global presence when room changes
  useEffect(() => {
    globalChannelRef.current?.track({ user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, room_id: activeRoomId, room_name: activeRoomName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId, activeRoomName]);

  // Fetch items + realtime
  useEffect(() => {
    supabase.from("virtual_room_items").select("*").eq("room_id", activeRoomId).then(({ data }) => {
      if (data) setItems(data as RoomItem[]);
    });
    const itemCh = supabase
      .channel(`items-${activeRoomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "virtual_room_items", filter: `room_id=eq.${activeRoomId}` }, (payload) => {
        if (payload.eventType === "INSERT") setItems((prev) => [...prev, payload.new as RoomItem]);
        else if (payload.eventType === "UPDATE") setItems((prev) => prev.map((i) => i.id === payload.new.id ? payload.new as RoomItem : i));
        else if (payload.eventType === "DELETE") setItems((prev) => prev.filter((i) => i.id !== (payload.old as RoomItem).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(itemCh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId]);

  // Auto-close after 30 min inactivity
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 30 * 60 * 1000) onClose();
    }, 60_000);
    return () => clearInterval(timer);
  }, [onClose]);

  // Fetch chat messages
  useEffect(() => {
    setLogMessages([]);
    supabase
      .from("messages")
      .select("id, content, user_id, created_at, profiles(display_name, avatar_color)")
      .eq("room_id", activeRoomId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setLogMessages((data as LogMessage[]).reverse()); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId]);

  useEffect(() => {
    if (chatLogRef.current) chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [logMessages]);

  const broadcastMove = useCallback((gx: number, gy: number) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "move",
      payload: { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx, gy, mood: myMoodRef.current } satisfies PresenceUser,
    });
  }, [currentProfile.id, currentProfile.display_name, myColor]);

  // Main presence/broadcast channel
  useEffect(() => {
    setUsers(new Map());
    setBubbles(new Map());
    const ch = supabase.channel(`virtual-${activeRoomId}`, { config: { presence: { key: currentProfile.id } } });
    channelRef.current = ch;
    const startPos = myPosRef.current;
    const myData: PresenceUser = { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: startPos.gx, gy: startPos.gy, mood: myMoodRef.current };

    ch
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState<PresenceUser>();
        const others: PresenceUser[] = [];
        for (const arr of Object.values(state)) {
          const p = arr[0] as PresenceUser;
          if (p?.user_id && p.user_id !== currentProfile.id) others.push(p);
        }
        setUsers((prev) => {
          const next = new Map(prev);
          for (const p of others) { if (!next.has(p.user_id)) next.set(p.user_id, p); }
          const activeIds = new Set(others.map((p) => p.user_id));
          for (const uid of Array.from(next.keys())) { if (!activeIds.has(uid)) next.delete(uid); }
          return next;
        });
        const cols = roomColsRef.current;
        const rows = roomRowsRef.current;
        const occupied = new Set(others.map((p) => `${p.gx},${p.gy}`));
        const cur = myPosRef.current;
        if (occupied.has(`${cur.gx},${cur.gy}`)) {
          outer: for (let dist = 1; dist < Math.max(cols, rows); dist++) {
            for (let dgx = -dist; dgx <= dist; dgx++) {
              for (let dgy = -dist; dgy <= dist; dgy++) {
                if (Math.abs(dgx) !== dist && Math.abs(dgy) !== dist) continue;
                const ngx = Math.max(0, Math.min(cols - 1, cur.gx + dgx));
                const ngy = Math.max(0, Math.min(rows - 1, cur.gy + dgy));
                if (!occupied.has(`${ngx},${ngy}`)) { moveMyPos(ngx, ngy); broadcastMove(ngx, ngy); break outer; }
              }
            }
          }
        }
      })
      .on("broadcast", { event: "move" }, ({ payload }) => {
        const p = payload as PresenceUser;
        if (!p?.user_id || p.user_id === currentProfile.id) return;
        setUsers((prev) => { const m = new Map(prev); m.set(p.user_id, p); return m; });
      })
      .on("broadcast", { event: "kick" }, ({ payload }) => {
        if ((payload as { user_id: string }).user_id === currentProfile.id) onClose();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoomId}` }, async (payload) => {
        const sid: string = payload.new.user_id;
        const txt: string = payload.new.content;
        setBubbles((prev) => { const m = new Map(prev); m.set(sid, { text: txt, ts: Date.now() }); return m; });
        setTimeout(() => {
          setBubbles((prev) => { const m = new Map(prev); const b = m.get(sid); if (b && Date.now() - b.ts >= 4900) m.delete(sid); return m; });
        }, 5000);
        const { data } = await supabase.from("messages").select("id, content, user_id, created_at, profiles(display_name, avatar_color)").eq("id", payload.new.id).single();
        if (data) setLogMessages((prev) => [...prev.slice(-49), data as LogMessage]);
      })
      .subscribe(() => { ch.track(myData); broadcastMove(myData.gx, myData.gy); });

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId]);

  // Keyboard input → draft (capture any keypress not in an input/textarea)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "Enter") {
        sendDraftRef.current();
        return;
      }
      if (e.key === "Escape") {
        draftRef.current = "";
        setDraft("");
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setDraft((prev) => { const next = prev.slice(0, -1); draftRef.current = next; return next; });
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (draftRef.current.length >= 200) return;
        e.preventDefault();
        setDraft((prev) => { const next = prev + e.key; draftRef.current = next; return next; });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // uses refs — no stale closures

  useEffect(() => {
    const h = () => setCtxMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  const handleTileClick = (gx: number, gy: number) => {
    setCtxMenu(null);
    if (Array.from(users.values()).some((u) => u.user_id !== currentProfile.id && u.gx === gx && u.gy === gy)) return;
    moveMyPos(gx, gy);
    broadcastMove(gx, gy);
  };

  const handleRightClick = (e: React.MouseEvent, user: PresenceUser | null, item: RoomItem | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.user_id === currentProfile.id) { setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "self" }); return; }
    if (user) { setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "user", user }); return; }
    if (item) { setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "tile_item", item }); return; }
  };

  const openProfile = async (userId: string) => {
    setCtxMenu(null);
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfileView(data as Profile);
  };

  const kickUser = (user: PresenceUser) => {
    setCtxMenu(null);
    channelRef.current?.send({ type: "broadcast", event: "kick", payload: { user_id: user.user_id } });
  };

  const switchRoom = (id: string, name: string, cols?: number, rows?: number) => {
    const nc = cols ?? roomColsRef.current;
    const nr = rows ?? roomRowsRef.current;
    setActiveRoomId(id);
    setActiveRoomName(name);
    setRoomDimensions(nc, nr);
    setRightPanel("chatlog");
    lastActivityRef.current = Date.now();
    myPosRef.current = { gx: Math.floor(Math.random() * nc), gy: Math.floor(Math.random() * nr) };
    setMyPos(myPosRef.current);
  };

  // sendDraftRef.current is re-assigned every render so it always has latest activeRoomId
  sendDraftRef.current = async () => {
    const t = draftRef.current.trim();
    if (!t) return;
    draftRef.current = "";
    setDraft("");
    lastActivityRef.current = Date.now();
    await supabase.from("messages").insert({ content: t, user_id: currentProfile.id, room_id: activeRoomId });
  };

  // Item actions
  const pickupItem = async (item: RoomItem) => { setCtxMenu(null); await supabase.from("virtual_room_items").update({ owner_id: currentProfile.id, gx: null, gy: null }).eq("id", item.id); };
  const dropItem   = async (item: RoomItem) => { setCtxMenu(null); await supabase.from("virtual_room_items").update({ owner_id: null, gx: myPosRef.current.gx, gy: myPosRef.current.gy }).eq("id", item.id); };
  const giveItem   = async (item: RoomItem, uid: string) => { setCtxMenu(null); await supabase.from("virtual_room_items").update({ owner_id: uid, gx: null, gy: null }).eq("id", item.id); };
  const deleteItem = async (id: string) => { setCtxMenu(null); await supabase.from("virtual_room_items").delete().eq("id", id); };

  const createItem = async () => {
    if (!createForm?.name.trim()) return;
    await supabase.from("virtual_room_items").insert({ room_id: activeRoomId, name: createForm.name.trim(), item_type: createForm.item_type, item_scale: 1, owner_id: currentProfile.id, gx: null, gy: null, created_by: currentProfile.id });
    setCreateForm(null);
  };

  const saveItemName = async (item: RoomItem, name: string) => {
    if (name.trim()) await supabase.from("virtual_room_items").update({ name: name.trim() }).eq("id", item.id);
    setEditItem(null);
  };

  const updateItemScale = async (item: RoomItem, delta: number) => {
    const next = Math.round(Math.min(3, Math.max(0.3, (item.item_scale ?? 1) + delta)) * 10) / 10;
    await supabase.from("virtual_room_items").update({ item_scale: next }).eq("id", item.id);
  };

  const createRoom = async () => {
    if (!createRoomForm?.name.trim()) return;
    const { data } = await supabase.from("chat_rooms")
      .insert({ name: createRoomForm.name.trim(), cols: createRoomForm.cols, rows: createRoomForm.rows })
      .select("id, name, cols, rows").single();
    if (data) setRooms((prev) => [...prev, data as ChatRoom].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateRoomForm(null);
  };

  const reloadChat = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("id, content, user_id, created_at, profiles(display_name, avatar_color)")
      .eq("room_id", activeRoomId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setLogMessages((data as LogMessage[]).reverse());
    broadcastMove(myPosRef.current.gx, myPosRef.current.gy);
  }, [activeRoomId, broadcastMove]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived data
  const usersByCell = useMemo(() => {
    const m = new Map<string, PresenceUser>();
    Array.from(users.values()).forEach((u) => { if (u.user_id !== currentProfile.id) m.set(`${u.gx},${u.gy}`, u); });
    m.set(`${myPos.gx},${myPos.gy}`, { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: myPos.gx, gy: myPos.gy, mood: myMood });
    return m;
  }, [users, myPos, myMood, currentProfile.id, currentProfile.display_name, myColor]);

  const itemsByCell = useMemo(() => {
    const m = new Map<string, RoomItem>();
    items.filter((i) => i.gx !== null && i.gy !== null && i.owner_id === null).forEach((i) => m.set(`${i.gx},${i.gy}`, i));
    return m;
  }, [items]);

  const myInventory = useMemo(() => items.filter((i) => i.owner_id === currentProfile.id), [items, currentProfile.id]);

  const sortedTiles = useMemo(() => {
    const t: { gx: number; gy: number }[] = [];
    for (let gy = 0; gy < roomRows; gy++) for (let gx = 0; gx < roomCols; gx++) t.push({ gx, gy });
    return t.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
  }, [roomCols, roomRows]);

  const totalUsers = users.has(currentProfile.id) ? users.size : users.size + 1;
  const theme = useMemo(() => getRoomTheme(activeRoomName), [activeRoomName]);

  const roomOccupancy = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of globalUsers.values()) m.set(u.room_id, (m.get(u.room_id) ?? 0) + 1);
    return m;
  }, [globalUsers]);

  const windowStyle = fullscreen
    ? { width: "100vw", height: "100vh", borderRadius: "0" }
    : { width: "min(96vw, 1040px)", height: "min(88vh, 660px)" };

  // Reusable bubble renderer for SVG
  const renderSvgBubble = (ax: number, ay: number, text: string, color: string, opacity: number) => {
    const chPerLine = 16;
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    words.forEach((w) => { const next = cur ? `${cur} ${w}` : w; if (next.length > chPerLine && cur) { lines.push(cur); cur = w; } else { cur = next; } });
    if (cur) lines.push(cur);
    const capped = lines.slice(0, 3);
    const bw = Math.min(130, Math.max(50, capped[0].length * 6 + 20));
    const bh = capped.length * 14 + 10;
    const bTop = ay - AR_S - 22 - bh;
    return (
      <g>
        <rect x={ax - bw / 2} y={bTop} width={bw} height={bh} rx={7} fill={color} opacity={opacity} />
        <polygon points={`${ax - 4},${bTop + bh} ${ax + 4},${bTop + bh} ${ax},${bTop + bh + 7}`} fill={color} opacity={opacity} />
        {capped.map((line, i) => (
          <text key={i} x={ax} y={bTop + 13 + i * 14} textAnchor="middle" fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="500" fill="white" opacity={opacity}>{line}</text>
        ))}
      </g>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm" onClick={() => setCtxMenu(null)}>
      <div className="flex flex-col rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden bg-[#0a1220]" style={windowStyle} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#07101c] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100">#{activeRoomName}</span>
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">{totalUsers} online</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setFullscreen((f) => !f)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors">
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* Isometric room */}
          <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ background: theme.even }}>
            <svg
              viewBox={`${svgW / 2 - svgW / (2 * zoom)} ${svgH / 2 - svgH / (2 * zoom)} ${svgW / zoom} ${svgH / zoom}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ width: "100%", height: "100%" }}
            >
              <rect width={svgW} height={svgH} fill={theme.even} />

              {sortedTiles.map(({ gx, gy }) => {
                const { x, y } = isoCenter(gx, gy, svgW);
                const cellKey = `${gx},${gy}`;
                const cellUser = usersByCell.get(cellKey);
                const cellItem = itemsByCell.get(cellKey);
                const isMe = cellUser?.user_id === currentProfile.id;
                const bubble = cellUser ? bubbles.get(cellUser.user_id) : undefined;
                const isHov = hovered === cellKey;
                const isMyTile = myPos.gx === gx && myPos.gy === gy;

                const tileFill = isMyTile ? theme.highlight : isHov ? "#192e4a" : (gx + gy) % 2 === 0 ? theme.even : theme.odd;
                const ax = x;
                const ay = y - AR_S;

                return (
                  <g key={cellKey} onClick={() => handleTileClick(gx, gy)} onContextMenu={(e) => handleRightClick(e, cellUser ?? null, cellItem ?? null)} onMouseEnter={() => setHovered(cellKey)} onMouseLeave={() => setHovered(null)} style={{ cursor: (cellUser && !isMe) ? "default" : "pointer" }}>
                    <polygon points={tilePts(x, y)} fill={tileFill} stroke={isMyTile ? myColor : "#16243a"} strokeWidth={isMyTile ? 1.5 : 0.7} />
                    {isHov && !cellUser && <polygon points={tilePts(x, y)} fill="rgba(80,140,255,0.08)" stroke="rgba(80,140,255,0.25)" strokeWidth={0.8} />}

                    {/* Item on tile — always rendered, avatar draws on top */}
                    {cellItem && (
                      <g transform={`translate(${x}, ${y - TH / 4}) scale(${0.85 * (cellItem.item_scale ?? 1)})`}>
                        <ItemSVG type={cellItem.item_type} />
                      </g>
                    )}

                    {/* User avatar */}
                    {cellUser && (
                      <g>
                        <ellipse cx={ax} cy={y} rx={18} ry={5} fill="rgba(0,0,0,0.45)" />
                        <g transform={`translate(${ax}, ${ay}) scale(${AVG_SCALE})`}>
                          <PersonAvatar color={cellUser.color} glow={isMe} mood={cellUser.mood} />
                        </g>
                        <text x={ax} y={ay - AR_S - 6} textAnchor="middle" fontSize={10} fontFamily="system-ui,sans-serif" fontWeight="700" stroke="rgba(0,0,0,0.95)" strokeWidth={3} fill="rgba(0,0,0,0.95)">{isMe ? "Du" : cellUser.display_name}</text>
                        <text x={ax} y={ay - AR_S - 6} textAnchor="middle" fontSize={10} fontFamily="system-ui,sans-serif" fontWeight="700" fill="white">{isMe ? "Du" : cellUser.display_name}</text>
                        {/* Gray draft bubble while typing */}
                        {isMe && draft && renderSvgBubble(ax, ay, draft + "…", "#475569", 0.85)}
                        {/* Sent speech bubble */}
                        {bubble && renderSvgBubble(ax, ay, bubble.text, cellUser.color, 0.95)}
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right panel */}
          <div className="w-56 flex-shrink-0 flex flex-col bg-[#07101c]/60 border-l border-white/[0.06]">

            {/* Online users list */}
            {rightPanel === "online" && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Online ({globalUsers.size})</span>
                  <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  {globalUsers.size === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen online</p>}
                  {Array.from(globalUsers.values()).map((u) => {
                    const isMe = u.user_id === currentProfile.id;
                    const inSameRoom = u.room_id === activeRoomId;
                    return (
                      <div key={u.user_id} className="px-3 py-2 flex items-center gap-2 hover:bg-white/[0.03]">
                        <div className="relative flex-shrink-0">
                          <div className="w-5 h-5 rounded-full" style={{ backgroundColor: u.color }} />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#07101c]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-slate-300 truncate">{isMe ? `${u.display_name} (dig)` : u.display_name}</p>
                          <p className={`text-[10px] truncate ${inSameRoom ? "text-violet-400" : "text-slate-600"}`}>#{u.room_name}</p>
                        </div>
                        {!inSameRoom && !isMe && (
                          <button onClick={() => { const r = rooms.find(r => r.id === u.room_id); if (r) switchRoom(r.id, r.name, r.cols, r.rows); }} className="text-[10px] text-slate-500 hover:text-violet-400 transition-colors flex-shrink-0">Gå til</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Room picker */}
            {rightPanel === "rooms" && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Skift rum</span>
                  <div className="flex items-center gap-1">
                    {isAdmin && <button onClick={() => setCreateRoomForm({ name: "", cols: 10, rows: 8 })} className="p-1 rounded text-slate-500 hover:text-emerald-400 transition-colors" title="Opret rum"><Plus className="w-3 h-3" /></button>}
                    <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                </div>
                {createRoomForm && isAdmin && (
                  <div className="px-3 py-2 border-b border-white/[0.06] bg-violet-500/5 flex-shrink-0">
                    <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Nyt rum</p>
                    <input autoFocus value={createRoomForm.name} onChange={(e) => setCreateRoomForm({ ...createRoomForm, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") createRoom(); if (e.key === "Escape") setCreateRoomForm(null); }} placeholder="Rum navn..." className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none mb-1.5 focus:border-violet-500/50" />
                    <div className="flex gap-1.5 mb-1">
                      <div className="flex-1">
                        <p className="text-[9px] text-slate-500 mb-0.5">Bredde</p>
                        <input type="number" min={4} max={20} value={createRoomForm.cols} onChange={(e) => setCreateRoomForm({ ...createRoomForm, cols: Math.max(4, Math.min(20, parseInt(e.target.value) || 10)) })} className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-violet-500/50" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] text-slate-500 mb-0.5">Dybde</p>
                        <input type="number" min={4} max={16} value={createRoomForm.rows} onChange={(e) => setCreateRoomForm({ ...createRoomForm, rows: Math.max(4, Math.min(16, parseInt(e.target.value) || 8)) })} className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-violet-500/50" />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-600 mb-1.5">{createRoomForm.cols * createRoomForm.rows} felter</p>
                    <div className="flex gap-1">
                      <button onClick={createRoom} className="flex-1 py-1 bg-violet-600 hover:bg-violet-500 rounded text-[10px] text-white transition-colors">Opret</button>
                      <button onClick={() => setCreateRoomForm(null)} className="flex-1 py-1 bg-white/[0.06] hover:bg-white/[0.1] rounded text-[10px] text-slate-300 transition-colors">Annuller</button>
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto py-1">
                  {rooms.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen rum fundet</p>}
                  {rooms.map((r) => {
                    const occupancy = roomOccupancy.get(r.id) ?? 0;
                    const capacity = r.cols * r.rows;
                    return (
                      <button key={r.id} onClick={() => switchRoom(r.id, r.name, r.cols, r.rows)}
                        className={`w-full text-left px-3 py-2 text-[12px] transition-colors flex items-center gap-2 ${r.id === activeRoomId ? "bg-violet-500/20 text-violet-300" : "text-slate-300 hover:bg-white/[0.05]"}`}
                      >
                        <span className="text-slate-500">#</span>
                        <span className="flex-1 truncate">{r.name}</span>
                        <span className={`text-[10px] flex-shrink-0 ${occupancy > 0 ? "text-emerald-500" : "text-slate-700"}`}>{occupancy}/{capacity}</span>
                        {r.id === activeRoomId && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Inventory */}
            {rightPanel === "inventory" && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Rygsæk ({myInventory.length})</span>
                  <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  {myInventory.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen genstande</p>}
                  {myInventory.map((item) => {
                    const meta = ITEM_TYPES.find((t) => t.type === item.item_type);
                    return (
                      <div key={item.id} className="px-3 py-2 flex items-center gap-2 hover:bg-white/[0.03]">
                        <div className="w-8 h-8 rounded bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                          <svg width="24" height="24" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-slate-300 truncate">{item.name}</p>
                          <p className="text-[10px]" style={{ color: meta?.color ?? "#6b7280" }}>{meta?.label ?? item.item_type}</p>
                        </div>
                        <button onClick={() => dropItem(item)} className="p-1 rounded text-slate-500 hover:text-emerald-400 transition-colors" title="Smid her">
                          <Package className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Admin panel */}
            {rightPanel === "admin" && isAdmin && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Genstande ({items.length})</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCreateForm({ name: "", item_type: "flower" })} className="p-1 rounded text-slate-500 hover:text-emerald-400 transition-colors"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                </div>
                {createForm && (
                  <div className="px-3 py-2 border-b border-white/[0.06] bg-violet-500/5 flex-shrink-0">
                    <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Ny genstand</p>
                    <input autoFocus value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") createItem(); if (e.key === "Escape") setCreateForm(null); }} placeholder="Navn..." className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none mb-1.5 focus:border-violet-500/50" />
                    <select value={createForm.item_type} onChange={(e) => setCreateForm({ ...createForm, item_type: e.target.value })} className="w-full bg-[#0a1220] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-300 outline-none mb-1.5">
                      {ITEM_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                    </select>
                    <div className="flex gap-1">
                      <button onClick={createItem} className="flex-1 py-1 bg-violet-600 hover:bg-violet-500 rounded text-[10px] text-white transition-colors">Opret</button>
                      <button onClick={() => setCreateForm(null)} className="flex-1 py-1 bg-white/[0.06] hover:bg-white/[0.1] rounded text-[10px] text-slate-300 transition-colors">Annuller</button>
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto py-1">
                  {items.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen genstande</p>}
                  {items.map((item) => {
                    const meta = ITEM_TYPES.find((t) => t.type === item.item_type);
                    const loc = item.owner_id ? "Inventar" : item.gx !== null ? `(${item.gx},${item.gy})` : "?";
                    const scale = item.item_scale ?? 1;
                    return (
                      <div key={item.id} className="px-2 py-1.5 hover:bg-white/[0.03] group">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                            <svg width="18" height="18" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg>
                          </div>
                          {editItem?.id === item.id ? (
                            <input autoFocus value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} onBlur={() => saveItemName(item, editItem.name)} onKeyDown={(e) => { if (e.key === "Enter") saveItemName(item, editItem.name); if (e.key === "Escape") setEditItem(null); }} className="flex-1 bg-white/[0.06] border border-violet-500/50 rounded px-1 py-0.5 text-[11px] text-slate-100 outline-none" />
                          ) : (
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-slate-300 truncate">{item.name}</p>
                              <p className="text-[9px] text-slate-600">{meta?.label} · {loc}</p>
                            </div>
                          )}
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditItem(item)} className="p-0.5 text-slate-500 hover:text-blue-400 transition-colors"><Pencil className="w-2.5 h-2.5" /></button>
                            <button onClick={() => deleteItem(item.id)} className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-1 pl-7">
                          <button onClick={() => updateItemScale(item, -0.2)} className="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 transition-colors"><Minus className="w-2.5 h-2.5" /></button>
                          <span className="text-[9px] text-slate-500 w-8 text-center">{Math.round(scale * 100)}%</span>
                          <button onClick={() => updateItemScale(item, 0.2)} className="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 transition-colors"><Plus className="w-2.5 h-2.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Chat log (default) */}
            {(rightPanel === "chatlog" || (rightPanel === "admin" && !isAdmin)) && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Chatlog</span>
                </div>
                <div ref={chatLogRef} className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5">
                  {logMessages.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen beskeder endnu</p>}
                  {logMessages.map((msg) => {
                    const p = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
                    const isMe = msg.user_id === currentProfile.id;
                    return (
                      <div key={msg.id} className="text-[11px] leading-snug">
                        <span className="font-semibold" style={{ color: p?.avatar_color ?? "#8b5cf6" }}>{isMe ? "Du" : (p?.display_name ?? "?")}: </span>
                        <span className="text-slate-300 break-words">{msg.content}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#07101c]">
          <div className="flex items-center gap-1 px-3 py-2">
            <button onClick={reloadChat} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors" title="Genindlæs chat"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={() => setRightPanel((p) => p === "online" ? "chatlog" : "online")} className={`p-2 rounded-lg transition-colors relative ${rightPanel === "online" ? "text-violet-400 bg-violet-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]"}`} title="Online brugere">
              <Users className="w-4 h-4" />
              {globalUsers.size > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold">{globalUsers.size}</span>}
            </button>
            <button onClick={() => setRightPanel((p) => p === "inventory" ? "chatlog" : "inventory")} className={`p-2 rounded-lg transition-colors relative ${rightPanel === "inventory" ? "text-violet-400 bg-violet-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]"}`} title="Min rygsæk">
              <Package className="w-4 h-4" />
              {myInventory.length > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-violet-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold">{myInventory.length}</span>}
            </button>
            <button onClick={() => setRightPanel((p) => p === "rooms" ? "chatlog" : "rooms")} className={`p-2 rounded-lg transition-colors ${rightPanel === "rooms" ? "text-violet-400 bg-violet-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]"}`} title="Skift rum"><Hash className="w-4 h-4" /></button>
            {isAdmin && <button onClick={() => setRightPanel((p) => p === "admin" ? "chatlog" : "admin")} className={`p-2 rounded-lg transition-colors ${rightPanel === "admin" ? "text-violet-400 bg-violet-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]"}`} title="Admin: genstande"><Wrench className="w-4 h-4" /></button>}
            <div className="flex items-center gap-0.5 ml-1">
              <button onClick={() => setZoom((z) => Math.min(2.5, parseFloat((z + 0.2).toFixed(1))))} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors" title="Zoom ind"><ZoomIn className="w-4 h-4" /></button>
              <span className="text-[10px] text-slate-600 w-8 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.max(0.4, parseFloat((z - 0.2).toFixed(1))))} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors" title="Zoom ud"><ZoomOut className="w-4 h-4" /></button>
            </div>
            {/* Draft preview */}
            {draft ? (
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/60 rounded-lg border border-white/[0.08] max-w-[220px]">
                <span className="text-[11px] text-slate-300 flex-1 truncate">{draft}</span>
                <span className="text-[9px] text-slate-500 flex-shrink-0">↵</span>
                <button onClick={() => { draftRef.current = ""; setDraft(""); }} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <span className="ml-auto text-[10px] text-slate-600 hidden sm:inline">Tast for at skrive</span>
            )}
          </div>
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div className="fixed z-[60] bg-slate-800 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden min-w-[200px] max-w-[240px]" style={{ left: ctxMenu.clientX, top: ctxMenu.clientY }} onClick={(e) => e.stopPropagation()}>

          {ctxMenu.kind === "self" && (
            <>
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <p className="text-[10px] font-semibold text-slate-500 mb-2">Ansigtsudtryk</p>
                <div className="flex gap-1">
                  {MOODS.map((m) => (
                    <button key={m.id} onClick={() => { changeMood(m.id); setCtxMenu(null); }}
                      className={`flex-1 py-1.5 rounded text-base transition-all ${myMood === m.id ? "bg-violet-500/25 ring-1 ring-violet-500/50" : "bg-white/[0.04] hover:bg-white/[0.1]"}`}
                      title={m.label}
                    >{m.emoji}</button>
                  ))}
                </div>
              </div>
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-slate-300">Rygsæk ({myInventory.length})</span>
              </div>
              {myInventory.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">Ingen genstande</p>}
              {myInventory.map((item) => (
                <button key={item.id} onClick={() => dropItem(item)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.06] transition-colors flex items-center gap-2">
                  <svg width="16" height="16" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg>
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">Smid</span>
                </button>
              ))}
            </>
          )}

          {ctxMenu.kind === "user" && ctxMenu.user && (() => {
            const theirItems = items.filter((i) => i.owner_id === ctxMenu.user!.user_id);
            return (
              <>
                <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: ctxMenu.user.color }} />
                  <span className="text-xs font-semibold text-slate-200 truncate">{ctxMenu.user.display_name}</span>
                </div>
                <button className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] transition-colors" onClick={() => openProfile(ctxMenu.user!.user_id)}>Se profil</button>
                {theirItems.length > 0 && (
                  <div className="border-t border-white/[0.06]">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Bærer ({theirItems.length})</p>
                    {theirItems.map((item) => (
                      <div key={item.id} className="px-3 py-1.5 flex items-center gap-2 text-sm text-slate-400">
                        <svg width="14" height="14" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg>
                        <span className="truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isAdmin && (
                  <>
                    {myInventory.length > 0 && (
                      <div className="border-t border-white/[0.06]">
                        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Giv genstand</p>
                        {myInventory.map((item) => (
                          <button key={item.id} onClick={() => giveItem(item, ctxMenu.user!.user_id)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06] transition-colors flex items-center gap-2">
                            <svg width="14" height="14" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg>
                            <span className="truncate">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-white/[0.06]">
                      <button className="w-full text-left px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors" onClick={() => kickUser(ctxMenu.user!)}>Kick bruger</button>
                    </div>
                  </>
                )}
              </>
            );
          })()}

          {ctxMenu.kind === "tile_item" && ctxMenu.item && (
            <>
              <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <svg width="16" height="16" viewBox="-16 -16 32 32"><ItemSVG type={ctxMenu.item.item_type} /></svg>
                <span className="text-xs font-semibold text-slate-200 truncate">{ctxMenu.item.name}</span>
              </div>
              <button className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] transition-colors" onClick={() => pickupItem(ctxMenu.item!)}>Tag genstand</button>
              {isAdmin && <button className="w-full text-left px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors" onClick={() => deleteItem(ctxMenu.item!.id)}>Slet genstand</button>}
            </>
          )}
        </div>
      )}

      {profileView && <UserProfileModal profile={profileView} currentProfile={currentProfile} onClose={() => setProfileView(null)} />}
    </div>
  );
}
