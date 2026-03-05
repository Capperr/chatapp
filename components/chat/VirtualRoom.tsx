"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Users, Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut, Hash, Wrench, Plus, Trash2, Pencil, Package, Minus, Shirt, Bot } from "lucide-react";
import type { Profile } from "@/types";
import { UserProfileModal } from "./UserProfileModal";

// ─── Grid constants ────────────────────────────────────────────────────────────
const TW = 80;
const TH = 40;
const AR = 20;
const AVG_SCALE = 1.4;
const AR_S = Math.round(AR * AVG_SCALE);
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
        return (<g><circle cx="-3" cy="-13" r="1.3" fill="#2d1b0e" /><circle cx="3" cy="-13" r="1.3" fill="#2d1b0e" /><ellipse cx="-2.5" cy="-10" rx="0.7" ry="1.1" fill="#93c5fd" opacity="0.85" /><path d="M -2.5,-7.5 Q 0,-9.5 2.5,-7.5" stroke="#b07848" strokeWidth="0.9" fill="none" strokeLinecap="round" /></g>);
      case "angry":
        return (<g><line x1="-5.5" y1="-17" x2="-1" y2="-14.5" stroke="#2d1b0e" strokeWidth="1.3" strokeLinecap="round" /><line x1="5.5" y1="-17" x2="1" y2="-14.5" stroke="#2d1b0e" strokeWidth="1.3" strokeLinecap="round" /><circle cx="-3" cy="-12.5" r="1.3" fill="#2d1b0e" /><circle cx="3" cy="-12.5" r="1.3" fill="#2d1b0e" /><path d="M -2.5,-8 Q 0,-6.5 2.5,-8" stroke="#b07848" strokeWidth="0.9" fill="none" strokeLinecap="round" /></g>);
      case "tired":
        return (<g><circle cx="-3" cy="-13" r="1.3" fill="#2d1b0e" /><circle cx="3" cy="-13" r="1.3" fill="#2d1b0e" /><path d="M -4.8,-13 Q -3,-15 -1.2,-13" fill={skin} stroke="none" /><path d="M 1.2,-13 Q 3,-15 4.8,-13" fill={skin} stroke="none" /><text x="6" y="-16" fontSize="4.5" fill="#94a3b8" fontFamily="system-ui">zzz</text><path d="M -2,-8.5 L 2,-8.5" stroke="#b07848" strokeWidth="0.9" fill="none" strokeLinecap="round" /></g>);
      default:
        return (<g><circle cx="-3" cy="-13" r="1.3" fill="#2d1b0e" /><circle cx="3" cy="-13" r="1.3" fill="#2d1b0e" /><path d="M -2.5,-9.5 Q 0,-7.5 2.5,-9.5" stroke="#b07848" strokeWidth="0.9" fill="none" strokeLinecap="round" /></g>);
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

// ─── Clothing layer SVG ────────────────────────────────────────────────────────
// Coordinates are in PersonAvatar's local space (before outer scale)
function ClothingLayerSVG({ styleKey, color }: { styleKey: string; color: string }) {
  switch (styleKey) {
    case "top_hat": return (
      <g>
        <rect x="-5" y="-32" width="10" height="13" rx="0.5" fill={color} />
        <rect x="-9" y="-20" width="18" height="2.5" rx="1" fill={color} />
      </g>
    );
    case "cap": return (
      <g>
        <path d="M-8,-19 Q-7,-27 0,-28 Q7,-27 8,-19 Z" fill={color} />
        <rect x="-8" y="-20" width="16" height="3" rx="1.5" fill={color} />
        <path d="M0,-20 Q5,-19 12,-22" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    );
    case "crown": return (
      <g>
        <path d="M-9,-19 L-9,-27 L-4,-23 L0,-28 L4,-23 L9,-27 L9,-19 Z" fill={color} />
        <circle cx="-3.5" cy="-23.5" r="1.5" fill="#f87171" />
        <circle cx="0" cy="-26.5" r="1.5" fill="#34d399" />
        <circle cx="3.5" cy="-23.5" r="1.5" fill="#60a5fa" />
      </g>
    );
    case "cowboy": return (
      <g>
        <rect x="-5" y="-27" width="10" height="7" rx="1" fill={color} />
        <ellipse cx="0" cy="-20" rx="12" ry="2.5" fill={color} />
        <path d="M-12,-20 Q-15,-18 -12,-15" fill="none" stroke={color} strokeWidth="2" />
        <path d="M12,-20 Q15,-18 12,-15" fill="none" stroke={color} strokeWidth="2" />
      </g>
    );
    case "hair_long": return (
      <g>
        <path d="M-8,-19 Q-5,-26 0,-27 Q5,-26 8,-19" fill={color} />
        <path d="M-8,-19 Q-13,-10 -12,5" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M8,-19 Q13,-10 12,5" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
      </g>
    );
    case "hair_color": return (
      <g>
        <path d="M-8,-19 Q-6,-27 0,-28 Q6,-27 8,-19" fill={color} />
        <path d="M-8,-19 Q-12,-13 -11,-3" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <path d="M8,-19 Q12,-13 11,-3" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
    case "glasses_round": return (
      <g>
        <circle cx="-3.8" cy="-13" r="3.2" fill="none" stroke={color} strokeWidth="1.3" />
        <circle cx="3.8" cy="-13" r="3.2" fill="none" stroke={color} strokeWidth="1.3" />
        <line x1="-0.6" y1="-13" x2="0.6" y2="-13" stroke={color} strokeWidth="1" />
        <line x1="-7.5" y1="-13" x2="-9.5" y2="-12" stroke={color} strokeWidth="1" />
        <line x1="7.5" y1="-13" x2="9.5" y2="-12" stroke={color} strokeWidth="1" />
      </g>
    );
    case "glasses_square": return (
      <g>
        <rect x="-8.5" y="-16" width="6.5" height="5.5" rx="0.5" fill="none" stroke={color} strokeWidth="1.3" />
        <rect x="2" y="-16" width="6.5" height="5.5" rx="0.5" fill="none" stroke={color} strokeWidth="1.3" />
        <line x1="-2" y1="-13" x2="2" y2="-13" stroke={color} strokeWidth="1" />
        <line x1="-9" y1="-13" x2="-11" y2="-12" stroke={color} strokeWidth="1" />
        <line x1="9" y1="-13" x2="11" y2="-12" stroke={color} strokeWidth="1" />
      </g>
    );
    case "glasses_sun": return (
      <g>
        <rect x="-9" y="-16" width="7" height="5.5" rx="1" fill={color} opacity="0.88" />
        <rect x="2" y="-16" width="7" height="5.5" rx="1" fill={color} opacity="0.88" />
        <line x1="-2" y1="-13" x2="2" y2="-13" stroke="#9ca3af" strokeWidth="1" />
        <line x1="-9.5" y1="-13" x2="-11" y2="-12" stroke="#9ca3af" strokeWidth="1" />
        <line x1="9.5" y1="-13" x2="11" y2="-12" stroke="#9ca3af" strokeWidth="1" />
      </g>
    );
    case "beard_full": return (
      <path d="M-6,-4 Q-8,1 -5,5 Q-2,8 0,8 Q2,8 5,5 Q8,1 6,-4 Q3,-2 0,-1 Q-3,-2 -6,-4 Z" fill={color} />
    );
    case "beard_mustache": return (
      <path d="M-5.5,-6.5 Q-3,-3.5 0,-5.5 Q3,-3.5 5.5,-6.5" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" />
    );
    case "top_stripes": return (
      <g opacity="0.75">
        <rect x="-8" y="-4" width="16" height="13" rx="3" fill={color} />
        <line x1="-8" y1="-1" x2="8" y2="-1" stroke="white" strokeWidth="1.5" opacity="0.45" />
        <line x1="-8" y1="2" x2="8" y2="2" stroke="white" strokeWidth="1.5" opacity="0.45" />
        <line x1="-8" y1="5" x2="8" y2="5" stroke="white" strokeWidth="1.5" opacity="0.45" />
        <line x1="-8" y1="8" x2="8" y2="8" stroke="white" strokeWidth="1.5" opacity="0.45" />
      </g>
    );
    case "top_solid": return (
      <rect x="-8" y="-4" width="16" height="13" rx="3" fill={color} opacity="0.75" />
    );
    default: return null;
  }
}

function ClothingOverlay({ outfit, catalog }: { outfit: Record<string, string>; catalog: ClothingItem[] }) {
  return (
    <>
      {Object.entries(outfit).map(([slot, cid]) => {
        const item = catalog.find(c => c.id === cid);
        if (!item) return null;
        return <ClothingLayerSVG key={slot} styleKey={item.style_key} color={item.color} />;
      })}
    </>
  );
}

// ─── Mood config ───────────────────────────────────────────────────────────────
const MOODS = [
  { id: "happy", label: "Glad",  emoji: "😊" },
  { id: "sad",   label: "Trist", emoji: "😢" },
  { id: "angry", label: "Sur",   emoji: "😠" },
  { id: "tired", label: "Træt",  emoji: "😴" },
] as const;

// ─── Clothing slots config ─────────────────────────────────────────────────────
const CLOTHING_SLOTS = [
  { id: "hat",        label: "Hat",       emoji: "🎩" },
  { id: "hair",       label: "Hår",       emoji: "✂️" },
  { id: "glasses",    label: "Briller",   emoji: "👓" },
  { id: "beard",      label: "Skæg",      emoji: "🧔" },
  { id: "top",        label: "Trøje",     emoji: "👕" },
  { id: "left_hand",  label: "Venstre",   emoji: "🤚" },
  { id: "right_hand", label: "Højre",     emoji: "✋" },
];

// ─── Item SVGs ─────────────────────────────────────────────────────────────────
function FlowerSVG() { return (<g><line x1="0" y1="8" x2="0" y2="-3" stroke="#15803d" strokeWidth="2" strokeLinecap="round" /><circle cx="-4" cy="-7" r="3.5" fill="#fb7185" /><circle cx="4" cy="-7" r="3.5" fill="#fb7185" /><circle cx="0" cy="-11" r="3.5" fill="#fb7185" /><circle cx="-3" cy="-2" r="3.5" fill="#fb7185" /><circle cx="3" cy="-2" r="3.5" fill="#fb7185" /><circle cx="0" cy="-6" r="3.5" fill="#fde047" /></g>); }
function TVSVG() { return (<g><rect x="-11" y="-9" width="22" height="16" rx="2" fill="#1f2937" /><rect x="-9" y="-7" width="18" height="12" rx="1" fill="#1d4ed8" /><line x1="-7" y1="-5" x2="-3" y2="-1" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" /><rect x="-2" y="7" width="4" height="3" rx="1" fill="#374151" /><rect x="-6" y="10" width="12" height="2" rx="1" fill="#374151" /></g>); }
function DeskSVG() { return (<g><rect x="-13" y="-7" width="26" height="4" rx="2" fill="#92400e" /><rect x="-11" y="-3" width="3" height="14" rx="1" fill="#78350f" /><rect x="8" y="-3" width="3" height="14" rx="1" fill="#78350f" /><rect x="-9" y="4" width="18" height="3" rx="1" fill="#92400e" opacity="0.7" /></g>); }
function MailboxSVG() { return (<g><rect x="-1.5" y="-4" width="3" height="16" rx="1" fill="#6b7280" /><rect x="-9" y="-10" width="18" height="12" rx="2" fill="#dc2626" /><path d="M-9,-10 Q0,-17 9,-10" fill="#b91c1c" /><rect x="8" y="-12" width="2" height="8" fill="#6b7280" /><rect x="10" y="-12" width="6" height="4" fill="#dc2626" /><rect x="-6" y="-4" width="10" height="2" rx="0.5" fill="#fca5a5" /></g>); }
function CoffeeSVG() { return (<g><path d="M-3,-10 Q-6,-14 -3,-18" fill="none" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" /><path d="M3,-10 Q6,-14 3,-18" fill="none" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" /><rect x="-7" y="-9" width="14" height="12" rx="2" fill="#f97316" /><rect x="-5" y="-7" width="10" height="8" rx="1" fill="#7c2d12" opacity="0.8" /><path d="M7,-5 Q12,-5 12,-1 Q12,3 7,3" fill="none" stroke="#f97316" strokeWidth="2" /><ellipse cx="0" cy="3" rx="9" ry="2" fill="#e5e7eb" /></g>); }
function SofaSVG() { return (<g><rect x="-14" y="-2" width="28" height="10" rx="3" fill="#4f46e5" /><rect x="-14" y="-10" width="28" height="10" rx="3" fill="#4338ca" /><rect x="-16" y="-10" width="6" height="18" rx="3" fill="#4338ca" /><rect x="10" y="-10" width="6" height="18" rx="3" fill="#4338ca" /><line x1="0" y1="-9" x2="0" y2="8" stroke="#6d61f0" strokeWidth="1" opacity="0.5" /></g>); }

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
    case "flower": return <FlowerSVG />;
    case "tv": return <TVSVG />;
    case "desk": return <DeskSVG />;
    case "mailbox": return <MailboxSVG />;
    case "coffee": return <CoffeeSVG />;
    case "sofa": return <SofaSVG />;
    default: return <circle r="8" fill="#6b7280" />;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function isoCenter(gx: number, gy: number, svgW: number) {
  return { x: (gx - gy) * (TW / 2) + svgW / 2, y: (gx + gy) * (TH / 2) + OFFSET_Y };
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
  outfit?: Record<string, string>; // slot → clothing_id
}
interface SpeechBubble { text: string; ts: number; }
interface ClothingItem {
  id: string;
  name: string;
  slot: string;
  style_key: string;
  color: string;
}
interface UserWardrobeEntry {
  id: string;
  clothing_id: string;
  equipped: boolean;
}
interface RoomBot {
  id: string;
  room_id: string;
  name: string;
  color: string;
  gx: number;
  gy: number;
  message: string | null;
  moves_randomly: boolean;
  gives_clothing_id: string | null;
}
interface CtxMenu {
  clientX: number;
  clientY: number;
  kind: "user" | "self" | "tile_item" | "bot";
  user?: PresenceUser;
  item?: RoomItem;
  bot?: RoomBot;
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
type RightPanel = "chatlog" | "rooms" | "admin" | "inventory" | "online" | "wardrobe";

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
  const outfitRef = useRef<Record<string, string>>({});
  const botsRef = useRef<RoomBot[]>([]);
  const usersRef = useRef<Map<string, PresenceUser>>(new Map());

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
  const [bots, setBots] = useState<RoomBot[]>([]);
  const [clothingCatalog, setClothingCatalog] = useState<ClothingItem[]>([]);
  const [myWardrobe, setMyWardrobe] = useState<UserWardrobeEntry[]>([]);
  const [createForm, setCreateForm] = useState<{ name: string; item_type: string } | null>(null);
  const [editItem, setEditItem] = useState<RoomItem | null>(null);
  const [globalUsers, setGlobalUsers] = useState<Map<string, GlobalUser>>(new Map());
  const [createRoomForm, setCreateRoomForm] = useState<{ name: string; cols: number; rows: number } | null>(null);
  const [adminTab, setAdminTab] = useState<"items" | "bots">("items");
  const [createBotForm, setCreateBotForm] = useState<{ name: string; color: string; message: string; moves_randomly: boolean; gives_clothing_id: string } | null>(null);
  const [movingBotId, setMovingBotId] = useState<string | null>(null);

  // Keep refs in sync
  useEffect(() => { botsRef.current = bots; }, [bots]);
  useEffect(() => { usersRef.current = users; }, [users]);

  const svgW = useMemo(() => (Math.max(roomCols, roomRows) + 1) * TW, [roomCols, roomRows]);
  const svgH = useMemo(() => (roomCols + roomRows) * (TH / 2) + OFFSET_Y + TH * 2, [roomCols, roomRows]);

  const setRoomDimensions = (cols: number, rows: number) => {
    roomColsRef.current = cols; roomRowsRef.current = rows;
    setRoomCols(cols); setRoomRows(rows);
  };

  const moveMyPos = useCallback((gx: number, gy: number) => {
    myPosRef.current = { gx, gy }; setMyPos({ gx, gy }); lastActivityRef.current = Date.now();
  }, []);

  const myOutfit = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    myWardrobe.filter(w => w.equipped).forEach(w => {
      const item = clothingCatalog.find(c => c.id === w.clothing_id);
      if (item) out[item.slot] = w.clothing_id;
    });
    return out;
  }, [myWardrobe, clothingCatalog]);

  // Keep outfitRef in sync + re-broadcast when outfit changes
  useEffect(() => {
    outfitRef.current = myOutfit;
    if (channelRef.current) broadcastMove(myPosRef.current.gx, myPosRef.current.gy);
  }, [myOutfit]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeMood = (mood: string) => {
    myMoodRef.current = mood; setMyMood(mood);
    channelRef.current?.send({ type: "broadcast", event: "move", payload: { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: myPosRef.current.gx, gy: myPosRef.current.gy, mood, outfit: outfitRef.current } satisfies PresenceUser });
  };

  // ─── Data fetches ──────────────────────────────────────────────────────────
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

  useEffect(() => {
    supabase.from("virtual_clothing_items").select("*").order("slot").then(({ data }) => {
      if (data) setClothingCatalog(data as ClothingItem[]);
    });
    supabase.from("virtual_user_wardrobe").select("id, clothing_id, equipped").eq("user_id", currentProfile.id).then(({ data }) => {
      if (data) setMyWardrobe(data as UserWardrobeEntry[]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global presence
  useEffect(() => {
    const globalCh = supabase.channel("virtual-global", { config: { presence: { key: currentProfile.id } } });
    globalChannelRef.current = globalCh;
    globalCh.on("presence", { event: "sync" }, () => {
      const state = globalCh.presenceState<GlobalUser>();
      const all = new Map<string, GlobalUser>();
      for (const arr of Object.values(state)) { const p = arr[0] as GlobalUser; if (p?.user_id) all.set(p.user_id, p); }
      setGlobalUsers(all);
    }).subscribe(() => {
      globalCh.track({ user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, room_id: activeRoomId, room_name: activeRoomName });
    });
    return () => { supabase.removeChannel(globalCh); globalChannelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    globalChannelRef.current?.track({ user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, room_id: activeRoomId, room_name: activeRoomName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId, activeRoomName]);

  // Items realtime
  useEffect(() => {
    supabase.from("virtual_room_items").select("*").eq("room_id", activeRoomId).then(({ data }) => { if (data) setItems(data as RoomItem[]); });
    const itemCh = supabase.channel(`items-${activeRoomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "virtual_room_items", filter: `room_id=eq.${activeRoomId}` }, (payload) => {
        if (payload.eventType === "INSERT") setItems(prev => [...prev, payload.new as RoomItem]);
        else if (payload.eventType === "UPDATE") setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new as RoomItem : i));
        else if (payload.eventType === "DELETE") setItems(prev => prev.filter(i => i.id !== (payload.old as RoomItem).id));
      }).subscribe();
    return () => { supabase.removeChannel(itemCh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId]);

  // Bots realtime
  useEffect(() => {
    supabase.from("virtual_room_bots").select("*").eq("room_id", activeRoomId).then(({ data }) => { if (data) setBots(data as RoomBot[]); });
    const botCh = supabase.channel(`bots-${activeRoomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "virtual_room_bots", filter: `room_id=eq.${activeRoomId}` }, (payload) => {
        if (payload.eventType === "INSERT") setBots(prev => [...prev, payload.new as RoomBot]);
        else if (payload.eventType === "UPDATE") setBots(prev => prev.map(b => b.id === payload.new.id ? payload.new as RoomBot : b));
        else if (payload.eventType === "DELETE") setBots(prev => prev.filter(b => b.id !== (payload.old as RoomBot).id));
      }).subscribe();
    return () => { supabase.removeChannel(botCh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId]);

  // Bot random movement — leader = alphabetically first user_id in room
  useEffect(() => {
    const interval = setInterval(async () => {
      const allIds = [currentProfile.id, ...Array.from(usersRef.current.keys())];
      allIds.sort();
      if (allIds[0] !== currentProfile.id) return;
      const movingBots = botsRef.current.filter(b => b.moves_randomly);
      if (movingBots.length === 0) return;
      const occupied = new Set([
        `${myPosRef.current.gx},${myPosRef.current.gy}`,
        ...Array.from(usersRef.current.values()).map(u => `${u.gx},${u.gy}`),
        ...botsRef.current.map(b => `${b.gx},${b.gy}`),
      ]);
      for (const bot of movingBots) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const shuffled = dirs.sort(() => Math.random() - 0.5);
        for (const [dgx, dgy] of shuffled) {
          const ngx = Math.max(0, Math.min(roomColsRef.current - 1, bot.gx + dgx));
          const ngy = Math.max(0, Math.min(roomRowsRef.current - 1, bot.gy + dgy));
          if (!occupied.has(`${ngx},${ngy}`)) {
            occupied.delete(`${bot.gx},${bot.gy}`);
            occupied.add(`${ngx},${ngy}`);
            await supabase.from("virtual_room_bots").update({ gx: ngx, gy: ngy }).eq("id", bot.id);
            break;
          }
        }
      }
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId]);

  // Auto-close after 30 min inactivity
  useEffect(() => {
    const timer = setInterval(() => { if (Date.now() - lastActivityRef.current > 30 * 60 * 1000) onClose(); }, 60_000);
    return () => clearInterval(timer);
  }, [onClose]);

  // Fetch chat messages
  useEffect(() => {
    setLogMessages([]);
    supabase.from("messages").select("id, content, user_id, created_at, profiles(display_name, avatar_color)")
      .eq("room_id", activeRoomId).eq("is_deleted", false).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setLogMessages((data as LogMessage[]).reverse()); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId]);

  useEffect(() => { if (chatLogRef.current) chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight; }, [logMessages]);

  const broadcastMove = useCallback((gx: number, gy: number) => {
    channelRef.current?.send({ type: "broadcast", event: "move", payload: { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx, gy, mood: myMoodRef.current, outfit: outfitRef.current } satisfies PresenceUser });
  }, [currentProfile.id, currentProfile.display_name, myColor]);

  // Main presence/broadcast channel
  useEffect(() => {
    setUsers(new Map()); setBubbles(new Map());
    const ch = supabase.channel(`virtual-${activeRoomId}`, { config: { presence: { key: currentProfile.id } } });
    channelRef.current = ch;
    const startPos = myPosRef.current;
    const myData: PresenceUser = { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: startPos.gx, gy: startPos.gy, mood: myMoodRef.current, outfit: outfitRef.current };
    ch
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState<PresenceUser>();
        const others: PresenceUser[] = [];
        for (const arr of Object.values(state)) { const p = arr[0] as PresenceUser; if (p?.user_id && p.user_id !== currentProfile.id) others.push(p); }
        setUsers(prev => {
          const next = new Map(prev);
          for (const p of others) { if (!next.has(p.user_id)) next.set(p.user_id, p); }
          const activeIds = new Set(others.map(p => p.user_id));
          for (const uid of Array.from(next.keys())) { if (!activeIds.has(uid)) next.delete(uid); }
          return next;
        });
        const cols = roomColsRef.current; const rows = roomRowsRef.current;
        const occupied = new Set(others.map(p => `${p.gx},${p.gy}`));
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
        setUsers(prev => { const m = new Map(prev); m.set(p.user_id, p); return m; });
      })
      .on("broadcast", { event: "kick" }, ({ payload }) => {
        if ((payload as { user_id: string }).user_id === currentProfile.id) onClose();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoomId}` }, async (payload) => {
        const sid: string = payload.new.user_id; const txt: string = payload.new.content;
        setBubbles(prev => { const m = new Map(prev); m.set(sid, { text: txt, ts: Date.now() }); return m; });
        setTimeout(() => { setBubbles(prev => { const m = new Map(prev); const b = m.get(sid); if (b && Date.now() - b.ts >= 4900) m.delete(sid); return m; }); }, 5000);
        const { data } = await supabase.from("messages").select("id, content, user_id, created_at, profiles(display_name, avatar_color)").eq("id", payload.new.id).single();
        if (data) setLogMessages(prev => [...prev.slice(-49), data as LogMessage]);
      })
      .subscribe(() => { ch.track(myData); broadcastMove(myData.gx, myData.gy); });
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId]);

  // Keyboard → draft
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "Enter") { sendDraftRef.current(); return; }
      if (e.key === "Escape") { draftRef.current = ""; setDraft(""); return; }
      if (e.key === "Backspace") { e.preventDefault(); setDraft(prev => { const n = prev.slice(0, -1); draftRef.current = n; return n; }); return; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (draftRef.current.length >= 200) return;
        e.preventDefault();
        setDraft(prev => { const n = prev + e.key; draftRef.current = n; return n; });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const h = () => setCtxMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  const handleTileClick = (gx: number, gy: number) => {
    setCtxMenu(null);
    if (movingBotId) {
      supabase.from("virtual_room_bots").update({ gx, gy }).eq("id", movingBotId);
      setMovingBotId(null);
      return;
    }
    if (Array.from(users.values()).some(u => u.user_id !== currentProfile.id && u.gx === gx && u.gy === gy)) return;
    if (bots.some(b => b.gx === gx && b.gy === gy)) return;
    moveMyPos(gx, gy); broadcastMove(gx, gy);
  };

  const handleRightClick = (e: React.MouseEvent, user: PresenceUser | null, item: RoomItem | null, bot: RoomBot | null) => {
    e.preventDefault(); e.stopPropagation();
    if (user?.user_id === currentProfile.id) { setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "self" }); return; }
    if (user) { setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "user", user }); return; }
    if (bot) { setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "bot", bot }); return; }
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
    const nc = cols ?? roomColsRef.current; const nr = rows ?? roomRowsRef.current;
    setActiveRoomId(id); setActiveRoomName(name); setRoomDimensions(nc, nr); setRightPanel("chatlog");
    lastActivityRef.current = Date.now();
    myPosRef.current = { gx: Math.floor(Math.random() * nc), gy: Math.floor(Math.random() * nr) };
    setMyPos(myPosRef.current);
  };

  sendDraftRef.current = async () => {
    const t = draftRef.current.trim(); if (!t) return;
    draftRef.current = ""; setDraft(""); lastActivityRef.current = Date.now();
    await supabase.from("messages").insert({ content: t, user_id: currentProfile.id, room_id: activeRoomId });
  };

  // ─── Item actions ──────────────────────────────────────────────────────────
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

  // ─── Bot actions ───────────────────────────────────────────────────────────
  const createBot = async () => {
    if (!createBotForm?.name.trim()) return;
    await supabase.from("virtual_room_bots").insert({
      room_id: activeRoomId, name: createBotForm.name.trim(), color: createBotForm.color,
      message: createBotForm.message.trim() || null, moves_randomly: createBotForm.moves_randomly,
      gives_clothing_id: createBotForm.gives_clothing_id || null,
      gx: Math.floor(Math.random() * roomColsRef.current), gy: Math.floor(Math.random() * roomRowsRef.current),
      created_by: currentProfile.id,
    });
    setCreateBotForm(null);
  };

  const deleteBot = async (id: string) => { setCtxMenu(null); await supabase.from("virtual_room_bots").delete().eq("id", id); };

  // ─── Wardrobe actions ──────────────────────────────────────────────────────
  const equip = async (clothingId: string) => {
    const item = clothingCatalog.find(c => c.id === clothingId);
    if (!item) return;
    setMyWardrobe(prev => prev.map(w => {
      const wItem = clothingCatalog.find(c => c.id === w.clothing_id);
      if (wItem?.slot === item.slot && w.equipped) return { ...w, equipped: false };
      if (w.clothing_id === clothingId) return { ...w, equipped: true };
      return w;
    }));
    const toUnequip = myWardrobe.filter(w => {
      const wItem = clothingCatalog.find(c => c.id === w.clothing_id);
      return wItem?.slot === item.slot && w.equipped && w.clothing_id !== clothingId;
    });
    for (const w of toUnequip) await supabase.from("virtual_user_wardrobe").update({ equipped: false }).eq("id", w.id);
    await supabase.from("virtual_user_wardrobe").update({ equipped: true }).eq("user_id", currentProfile.id).eq("clothing_id", clothingId);
  };

  const unequip = async (clothingId: string) => {
    setMyWardrobe(prev => prev.map(w => w.clothing_id === clothingId ? { ...w, equipped: false } : w));
    await supabase.from("virtual_user_wardrobe").update({ equipped: false }).eq("user_id", currentProfile.id).eq("clothing_id", clothingId);
  };

  const takeFromBot = async (bot: RoomBot) => {
    if (!bot.gives_clothing_id) return;
    setCtxMenu(null);
    if (myWardrobe.some(w => w.clothing_id === bot.gives_clothing_id)) return;
    const tempEntry: UserWardrobeEntry = { id: "temp-" + Date.now(), clothing_id: bot.gives_clothing_id!, equipped: false };
    setMyWardrobe(prev => [...prev, tempEntry]);
    const { data } = await supabase.from("virtual_user_wardrobe")
      .upsert({ user_id: currentProfile.id, clothing_id: bot.gives_clothing_id, equipped: false })
      .select("id, clothing_id, equipped").single();
    if (data) setMyWardrobe(prev => prev.map(w => w.id === tempEntry.id ? data as UserWardrobeEntry : w));
  };

  // ─── Room creation ─────────────────────────────────────────────────────────
  const createRoom = async () => {
    if (!createRoomForm?.name.trim()) return;
    const { data } = await supabase.from("chat_rooms").insert({ name: createRoomForm.name.trim(), cols: createRoomForm.cols, rows: createRoomForm.rows }).select("id, name, cols, rows").single();
    if (data) setRooms(prev => [...prev, data as ChatRoom].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateRoomForm(null);
  };

  const reloadChat = useCallback(async () => {
    const { data } = await supabase.from("messages").select("id, content, user_id, created_at, profiles(display_name, avatar_color)")
      .eq("room_id", activeRoomId).eq("is_deleted", false).order("created_at", { ascending: false }).limit(50);
    if (data) setLogMessages((data as LogMessage[]).reverse());
    broadcastMove(myPosRef.current.gx, myPosRef.current.gy);
  }, [activeRoomId, broadcastMove]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Derived data ──────────────────────────────────────────────────────────
  const usersByCell = useMemo(() => {
    const m = new Map<string, PresenceUser>();
    Array.from(users.values()).forEach(u => { if (u.user_id !== currentProfile.id) m.set(`${u.gx},${u.gy}`, u); });
    m.set(`${myPos.gx},${myPos.gy}`, { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: myPos.gx, gy: myPos.gy, mood: myMood, outfit: myOutfit });
    return m;
  }, [users, myPos, myMood, myOutfit, currentProfile.id, currentProfile.display_name, myColor]);

  const itemsByCell = useMemo(() => {
    const m = new Map<string, RoomItem>();
    items.filter(i => i.gx !== null && i.gy !== null && i.owner_id === null).forEach(i => m.set(`${i.gx},${i.gy}`, i));
    return m;
  }, [items]);

  const botsByCell = useMemo(() => {
    const m = new Map<string, RoomBot>();
    bots.forEach(b => m.set(`${b.gx},${b.gy}`, b));
    return m;
  }, [bots]);

  const myInventory = useMemo(() => items.filter(i => i.owner_id === currentProfile.id), [items, currentProfile.id]);

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

  const renderSvgBubble = (ax: number, ay: number, text: string, color: string, opacity: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    words.forEach(w => { const n = cur ? `${cur} ${w}` : w; if (n.length > 16 && cur) { lines.push(cur); cur = w; } else { cur = n; } });
    if (cur) lines.push(cur);
    const capped = lines.slice(0, 3);
    const bw = Math.min(130, Math.max(50, capped[0].length * 6 + 20));
    const bh = capped.length * 14 + 10;
    const bTop = ay - AR_S - 22 - bh;
    return (
      <g>
        <rect x={ax - bw / 2} y={bTop} width={bw} height={bh} rx={7} fill={color} opacity={opacity} />
        <polygon points={`${ax - 4},${bTop + bh} ${ax + 4},${bTop + bh} ${ax},${bTop + bh + 7}`} fill={color} opacity={opacity} />
        {capped.map((line, i) => <text key={i} x={ax} y={bTop + 13 + i * 14} textAnchor="middle" fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="500" fill="white" opacity={opacity}>{line}</text>)}
      </g>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm" onClick={() => setCtxMenu(null)}>
      <div className="flex flex-col rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden bg-[#0a1220]" style={windowStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#07101c] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100">#{activeRoomName}</span>
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">{totalUsers} online</span>
            {movingBotId && <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Klik på en tile for at placere bot</span>}
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setFullscreen(f => !f)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors">
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* Isometric room */}
          <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ background: theme.even }}>
            <svg viewBox={`${svgW / 2 - svgW / (2 * zoom)} ${svgH / 2 - svgH / (2 * zoom)} ${svgW / zoom} ${svgH / zoom}`}
              preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
              <rect width={svgW} height={svgH} fill={theme.even} />

              {sortedTiles.map(({ gx, gy }) => {
                const { x, y } = isoCenter(gx, gy, svgW);
                const cellKey = `${gx},${gy}`;
                const cellUser = usersByCell.get(cellKey);
                const cellItem = itemsByCell.get(cellKey);
                const cellBot  = botsByCell.get(cellKey);
                const isMe = cellUser?.user_id === currentProfile.id;
                const bubble = cellUser ? bubbles.get(cellUser.user_id) : undefined;
                const isHov = hovered === cellKey;
                const isMyTile = myPos.gx === gx && myPos.gy === gy;
                const isBotTarget = !!movingBotId && !cellUser && !cellBot;

                const tileFill = isMyTile ? theme.highlight : isBotTarget && isHov ? "#1a3020" : isHov ? "#192e4a" : (gx + gy) % 2 === 0 ? theme.even : theme.odd;
                const tileStroke = isMyTile ? myColor : isBotTarget && isHov ? "#22c55e" : "#16243a";
                const ax = x; const ay = y - AR_S;

                return (
                  <g key={cellKey}
                    onClick={() => handleTileClick(gx, gy)}
                    onContextMenu={e => handleRightClick(e, cellUser ?? null, cellItem ?? null, cellBot ?? null)}
                    onMouseEnter={() => setHovered(cellKey)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: (cellUser && !isMe) || cellBot ? "default" : movingBotId ? "crosshair" : "pointer" }}>
                    <polygon points={tilePts(x, y)} fill={tileFill} stroke={tileStroke} strokeWidth={isMyTile ? 1.5 : 0.7} />
                    {isHov && !cellUser && !cellBot && !movingBotId && <polygon points={tilePts(x, y)} fill="rgba(80,140,255,0.08)" stroke="rgba(80,140,255,0.25)" strokeWidth={0.8} />}

                    {/* Item on tile */}
                    {cellItem && (
                      <g transform={`translate(${x}, ${y - TH / 4}) scale(${0.85 * (cellItem.item_scale ?? 1)})`}>
                        <ItemSVG type={cellItem.item_type} />
                      </g>
                    )}

                    {/* Bot */}
                    {cellBot && (
                      <g>
                        <ellipse cx={ax} cy={y} rx={16} ry={4} fill="rgba(0,0,0,0.3)" />
                        <g transform={`translate(${ax}, ${ay}) scale(${AVG_SCALE})`}>
                          <PersonAvatar color={cellBot.color} glow={false} mood="happy" />
                        </g>
                        <text x={ax} y={ay - AR_S - 6} textAnchor="middle" fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="700" stroke="rgba(0,0,0,0.95)" strokeWidth={3} fill="rgba(0,0,0,0.95)">{cellBot.name}</text>
                        <text x={ax} y={ay - AR_S - 6} textAnchor="middle" fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="700" fill="#94a3b8">{cellBot.name}</text>
                        <circle cx={ax + 15} cy={ay - AR_S - 8} r={5} fill="#1e293b" stroke="#475569" strokeWidth={0.8} />
                        <text x={ax + 15} y={ay - AR_S - 5.5} textAnchor="middle" fontSize={6} fill="#94a3b8">⚙</text>
                        {cellBot.gives_clothing_id && <text x={ax} y={y + TH / 4 + 8} textAnchor="middle" fontSize={8}>🎁</text>}
                        {cellBot.message && renderSvgBubble(ax, ay, cellBot.message, cellBot.color, 0.7)}
                      </g>
                    )}

                    {/* User avatar */}
                    {cellUser && (
                      <g>
                        <ellipse cx={ax} cy={y} rx={18} ry={5} fill="rgba(0,0,0,0.45)" />
                        <g transform={`translate(${ax}, ${ay}) scale(${AVG_SCALE})`}>
                          <PersonAvatar color={cellUser.color} glow={isMe} mood={cellUser.mood} />
                          {cellUser.outfit && Object.keys(cellUser.outfit).length > 0 && (
                            <ClothingOverlay outfit={cellUser.outfit} catalog={clothingCatalog} />
                          )}
                        </g>
                        <text x={ax} y={ay - AR_S - 6} textAnchor="middle" fontSize={10} fontFamily="system-ui,sans-serif" fontWeight="700" stroke="rgba(0,0,0,0.95)" strokeWidth={3} fill="rgba(0,0,0,0.95)">{isMe ? "Du" : cellUser.display_name}</text>
                        <text x={ax} y={ay - AR_S - 6} textAnchor="middle" fontSize={10} fontFamily="system-ui,sans-serif" fontWeight="700" fill="white">{isMe ? "Du" : cellUser.display_name}</text>
                        {isMe && draft && renderSvgBubble(ax, ay, draft + "…", "#475569", 0.85)}
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

            {/* Online users */}
            {rightPanel === "online" && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Online ({globalUsers.size})</span>
                  <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  {Array.from(globalUsers.values()).map(u => {
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
                        {!inSameRoom && !isMe && <button onClick={() => { const r = rooms.find(r => r.id === u.room_id); if (r) switchRoom(r.id, r.name, r.cols, r.rows); }} className="text-[10px] text-slate-500 hover:text-violet-400 flex-shrink-0">Gå til</button>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Wardrobe */}
            {rightPanel === "wardrobe" && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Garderobe</span>
                  <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {CLOTHING_SLOTS.map(slot => {
                    const slotItems = myWardrobe
                      .map(w => ({ w, item: clothingCatalog.find(c => c.id === w.clothing_id) }))
                      .filter(({ item }) => item?.slot === slot.id);
                    const equipped = slotItems.find(({ w }) => w.equipped);
                    return (
                      <div key={slot.id} className="border-b border-white/[0.04]">
                        <div className="px-3 py-1.5 flex items-center gap-1.5">
                          <span className="text-sm">{slot.emoji}</span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{slot.label}</span>
                          {equipped && (
                            <span className="ml-auto text-[9px] text-violet-400 truncate max-w-[80px]">{equipped.item?.name}</span>
                          )}
                        </div>
                        {slotItems.length === 0 && <p className="px-3 pb-2 text-[10px] text-slate-700">Ingen</p>}
                        {slotItems.map(({ w, item }) => item && (
                          <div key={w.id} className="px-3 py-1 flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className={`text-[11px] flex-1 truncate ${w.equipped ? "text-violet-300" : "text-slate-400"}`}>{item.name}</span>
                            {w.equipped
                              ? <button onClick={() => unequip(w.clothing_id)} className="text-[9px] text-slate-500 hover:text-rose-400 flex-shrink-0">Af</button>
                              : <button onClick={() => equip(w.clothing_id)} className="text-[9px] text-slate-500 hover:text-violet-400 flex-shrink-0">På</button>
                            }
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {myWardrobe.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-6 px-3">Ingen tøj endnu. Find en bot med 🎁 for at hente noget.</p>}
                </div>
              </>
            )}

            {/* Room picker */}
            {rightPanel === "rooms" && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Skift rum</span>
                  <div className="flex items-center gap-1">
                    {isAdmin && <button onClick={() => setCreateRoomForm({ name: "", cols: 10, rows: 8 })} className="p-1 rounded text-slate-500 hover:text-emerald-400" title="Opret rum"><Plus className="w-3 h-3" /></button>}
                    <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
                  </div>
                </div>
                {createRoomForm && isAdmin && (
                  <div className="px-3 py-2 border-b border-white/[0.06] bg-violet-500/5 flex-shrink-0">
                    <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Nyt rum</p>
                    <input autoFocus value={createRoomForm.name} onChange={e => setCreateRoomForm({ ...createRoomForm, name: e.target.value })} onKeyDown={e => { if (e.key === "Enter") createRoom(); if (e.key === "Escape") setCreateRoomForm(null); }} placeholder="Rum navn..." className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none mb-1.5 focus:border-violet-500/50" />
                    <div className="flex gap-1.5 mb-1">
                      <div className="flex-1"><p className="text-[9px] text-slate-500 mb-0.5">Bredde</p><input type="number" min={4} max={20} value={createRoomForm.cols} onChange={e => setCreateRoomForm({ ...createRoomForm, cols: Math.max(4, Math.min(20, parseInt(e.target.value) || 10)) })} className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-violet-500/50" /></div>
                      <div className="flex-1"><p className="text-[9px] text-slate-500 mb-0.5">Dybde</p><input type="number" min={4} max={16} value={createRoomForm.rows} onChange={e => setCreateRoomForm({ ...createRoomForm, rows: Math.max(4, Math.min(16, parseInt(e.target.value) || 8)) })} className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-violet-500/50" /></div>
                    </div>
                    <p className="text-[9px] text-slate-600 mb-1.5">{createRoomForm.cols * createRoomForm.rows} felter</p>
                    <div className="flex gap-1">
                      <button onClick={createRoom} className="flex-1 py-1 bg-violet-600 hover:bg-violet-500 rounded text-[10px] text-white">Opret</button>
                      <button onClick={() => setCreateRoomForm(null)} className="flex-1 py-1 bg-white/[0.06] hover:bg-white/[0.1] rounded text-[10px] text-slate-300">Annuller</button>
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto py-1">
                  {rooms.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen rum fundet</p>}
                  {rooms.map(r => {
                    const occ = roomOccupancy.get(r.id) ?? 0;
                    return (
                      <button key={r.id} onClick={() => switchRoom(r.id, r.name, r.cols, r.rows)}
                        className={`w-full text-left px-3 py-2 text-[12px] transition-colors flex items-center gap-2 ${r.id === activeRoomId ? "bg-violet-500/20 text-violet-300" : "text-slate-300 hover:bg-white/[0.05]"}`}>
                        <span className="text-slate-500">#</span>
                        <span className="flex-1 truncate">{r.name}</span>
                        <span className={`text-[10px] flex-shrink-0 ${occ > 0 ? "text-emerald-500" : "text-slate-700"}`}>{occ}/{r.cols * r.rows}</span>
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
                  <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  {myInventory.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen genstande</p>}
                  {myInventory.map(item => {
                    const meta = ITEM_TYPES.find(t => t.type === item.item_type);
                    return (
                      <div key={item.id} className="px-3 py-2 flex items-center gap-2 hover:bg-white/[0.03]">
                        <div className="w-8 h-8 rounded bg-white/[0.05] flex items-center justify-center flex-shrink-0"><svg width="24" height="24" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg></div>
                        <div className="flex-1 min-w-0"><p className="text-[12px] text-slate-300 truncate">{item.name}</p><p className="text-[10px]" style={{ color: meta?.color ?? "#6b7280" }}>{meta?.label ?? item.item_type}</p></div>
                        <button onClick={() => dropItem(item)} className="p-1 rounded text-slate-500 hover:text-emerald-400" title="Smid her"><Package className="w-3 h-3" /></button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Admin panel */}
            {rightPanel === "admin" && isAdmin && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                  <div className="flex gap-1">
                    <button onClick={() => setAdminTab("items")} className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${adminTab === "items" ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"}`}>Ting</button>
                    <button onClick={() => setAdminTab("bots")} className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${adminTab === "bots" ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"}`}>Bots</button>
                  </div>
                  <div className="flex items-center gap-1">
                    {adminTab === "items" && <button onClick={() => setCreateForm({ name: "", item_type: "flower" })} className="p-1 rounded text-slate-500 hover:text-emerald-400"><Plus className="w-3 h-3" /></button>}
                    {adminTab === "bots" && <button onClick={() => setCreateBotForm({ name: "", color: "#6366f1", message: "", moves_randomly: false, gives_clothing_id: "" })} className="p-1 rounded text-slate-500 hover:text-emerald-400"><Plus className="w-3 h-3" /></button>}
                    <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
                  </div>
                </div>

                {/* Items tab */}
                {adminTab === "items" && (
                  <>
                    {createForm && (
                      <div className="px-3 py-2 border-b border-white/[0.06] bg-violet-500/5 flex-shrink-0">
                        <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Ny genstand</p>
                        <input autoFocus value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} onKeyDown={e => { if (e.key === "Enter") createItem(); if (e.key === "Escape") setCreateForm(null); }} placeholder="Navn..." className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none mb-1.5 focus:border-violet-500/50" />
                        <select value={createForm.item_type} onChange={e => setCreateForm({ ...createForm, item_type: e.target.value })} className="w-full bg-[#0a1220] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-300 outline-none mb-1.5">
                          {ITEM_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                        </select>
                        <div className="flex gap-1">
                          <button onClick={createItem} className="flex-1 py-1 bg-violet-600 hover:bg-violet-500 rounded text-[10px] text-white">Opret</button>
                          <button onClick={() => setCreateForm(null)} className="flex-1 py-1 bg-white/[0.06] hover:bg-white/[0.1] rounded text-[10px] text-slate-300">Annuller</button>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto py-1">
                      {items.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen genstande</p>}
                      {items.map(item => {
                        const meta = ITEM_TYPES.find(t => t.type === item.item_type);
                        const loc = item.owner_id ? "Inventar" : item.gx !== null ? `(${item.gx},${item.gy})` : "?";
                        const scale = item.item_scale ?? 1;
                        return (
                          <div key={item.id} className="px-2 py-1.5 hover:bg-white/[0.03] group">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded bg-white/[0.05] flex items-center justify-center flex-shrink-0"><svg width="18" height="18" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg></div>
                              {editItem?.id === item.id
                                ? <input autoFocus value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} onBlur={() => saveItemName(item, editItem.name)} onKeyDown={e => { if (e.key === "Enter") saveItemName(item, editItem.name); if (e.key === "Escape") setEditItem(null); }} className="flex-1 bg-white/[0.06] border border-violet-500/50 rounded px-1 py-0.5 text-[11px] text-slate-100 outline-none" />
                                : <div className="flex-1 min-w-0"><p className="text-[11px] text-slate-300 truncate">{item.name}</p><p className="text-[9px] text-slate-600">{meta?.label} · {loc}</p></div>
                              }
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditItem(item)} className="p-0.5 text-slate-500 hover:text-blue-400"><Pencil className="w-2.5 h-2.5" /></button>
                                <button onClick={() => deleteItem(item.id)} className="p-0.5 text-slate-500 hover:text-rose-400"><Trash2 className="w-2.5 h-2.5" /></button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-1 pl-7">
                              <button onClick={() => updateItemScale(item, -0.2)} className="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400"><Minus className="w-2.5 h-2.5" /></button>
                              <span className="text-[9px] text-slate-500 w-8 text-center">{Math.round(scale * 100)}%</span>
                              <button onClick={() => updateItemScale(item, 0.2)} className="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400"><Plus className="w-2.5 h-2.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Bots tab */}
                {adminTab === "bots" && (
                  <>
                    {createBotForm && (
                      <div className="px-3 py-2 border-b border-white/[0.06] bg-violet-500/5 flex-shrink-0">
                        <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Ny bot</p>
                        <input autoFocus value={createBotForm.name} onChange={e => setCreateBotForm({ ...createBotForm, name: e.target.value })} onKeyDown={e => { if (e.key === "Escape") setCreateBotForm(null); }} placeholder="Navn..." className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none mb-1.5 focus:border-violet-500/50" />
                        <div className="flex items-center gap-2 mb-1.5">
                          <label className="text-[9px] text-slate-500">Farve</label>
                          <input type="color" value={createBotForm.color} onChange={e => setCreateBotForm({ ...createBotForm, color: e.target.value })} className="w-8 h-6 rounded cursor-pointer bg-transparent border border-white/[0.08]" />
                        </div>
                        <input value={createBotForm.message} onChange={e => setCreateBotForm({ ...createBotForm, message: e.target.value })} placeholder="Besked (valgfri)..." className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none mb-1.5 focus:border-violet-500/50" />
                        <div className="flex items-center gap-2 mb-1.5">
                          <input type="checkbox" id="bot-moves" checked={createBotForm.moves_randomly} onChange={e => setCreateBotForm({ ...createBotForm, moves_randomly: e.target.checked })} className="rounded" />
                          <label htmlFor="bot-moves" className="text-[10px] text-slate-400">Bevæger sig tilfældigt</label>
                        </div>
                        <select value={createBotForm.gives_clothing_id} onChange={e => setCreateBotForm({ ...createBotForm, gives_clothing_id: e.target.value })} className="w-full bg-[#0a1220] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-300 outline-none mb-1.5">
                          <option value="">Giver intet</option>
                          {clothingCatalog.map(c => <option key={c.id} value={c.id}>{c.name} ({CLOTHING_SLOTS.find(s => s.id === c.slot)?.label})</option>)}
                        </select>
                        <div className="flex gap-1">
                          <button onClick={createBot} className="flex-1 py-1 bg-violet-600 hover:bg-violet-500 rounded text-[10px] text-white">Opret</button>
                          <button onClick={() => setCreateBotForm(null)} className="flex-1 py-1 bg-white/[0.06] hover:bg-white/[0.1] rounded text-[10px] text-slate-300">Annuller</button>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto py-1">
                      {bots.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen bots</p>}
                      {bots.map(bot => {
                        const givesItem = clothingCatalog.find(c => c.id === bot.gives_clothing_id);
                        return (
                          <div key={bot.id} className="px-2 py-1.5 hover:bg-white/[0.03] group flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: bot.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-slate-300 truncate">{bot.name}</p>
                              <p className="text-[9px] text-slate-600">{bot.moves_randomly ? "Bevæger sig · " : ""}{givesItem ? `🎁 ${givesItem.name}` : "Ingen gave"}</p>
                            </div>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setMovingBotId(bot.id); setCtxMenu(null); }} className="p-0.5 text-slate-500 hover:text-amber-400 text-[8px]">Flyt</button>
                              <button onClick={() => deleteBot(bot.id)} className="p-0.5 text-slate-500 hover:text-rose-400"><Trash2 className="w-2.5 h-2.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Chat log */}
            {(rightPanel === "chatlog" || (rightPanel === "admin" && !isAdmin)) && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Chatlog</span>
                </div>
                <div ref={chatLogRef} className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5">
                  {logMessages.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen beskeder endnu</p>}
                  {logMessages.map(msg => {
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
            <button onClick={reloadChat} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors" title="Genindlæs"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={() => setRightPanel(p => p === "online" ? "chatlog" : "online")} className={`p-2 rounded-lg transition-colors relative ${rightPanel === "online" ? "text-violet-400 bg-violet-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]"}`} title="Online">
              <Users className="w-4 h-4" />
              {globalUsers.size > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold">{globalUsers.size}</span>}
            </button>
            <button onClick={() => setRightPanel(p => p === "wardrobe" ? "chatlog" : "wardrobe")} className={`p-2 rounded-lg transition-colors relative ${rightPanel === "wardrobe" ? "text-violet-400 bg-violet-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]"}`} title="Garderobe">
              <Shirt className="w-4 h-4" />
              {myWardrobe.filter(w => w.equipped).length > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-violet-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold">{myWardrobe.filter(w => w.equipped).length}</span>}
            </button>
            <button onClick={() => setRightPanel(p => p === "inventory" ? "chatlog" : "inventory")} className={`p-2 rounded-lg transition-colors relative ${rightPanel === "inventory" ? "text-violet-400 bg-violet-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]"}`} title="Rygsæk">
              <Package className="w-4 h-4" />
              {myInventory.length > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-violet-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold">{myInventory.length}</span>}
            </button>
            <button onClick={() => setRightPanel(p => p === "rooms" ? "chatlog" : "rooms")} className={`p-2 rounded-lg transition-colors ${rightPanel === "rooms" ? "text-violet-400 bg-violet-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]"}`} title="Rum"><Hash className="w-4 h-4" /></button>
            {isAdmin && <button onClick={() => setRightPanel(p => p === "admin" ? "chatlog" : "admin")} className={`p-2 rounded-lg transition-colors ${rightPanel === "admin" ? "text-violet-400 bg-violet-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]"}`} title="Admin"><Wrench className="w-4 h-4" /></button>}
            <div className="flex items-center gap-0.5 ml-1">
              <button onClick={() => setZoom(z => Math.min(2.5, parseFloat((z + 0.2).toFixed(1))))} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]" title="Zoom ind"><ZoomIn className="w-4 h-4" /></button>
              <span className="text-[10px] text-slate-600 w-8 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.max(0.4, parseFloat((z - 0.2).toFixed(1))))} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]" title="Zoom ud"><ZoomOut className="w-4 h-4" /></button>
            </div>
            {draft ? (
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/60 rounded-lg border border-white/[0.08] max-w-[200px]">
                <span className="text-[11px] text-slate-300 flex-1 truncate">{draft}</span>
                <span className="text-[9px] text-slate-500 flex-shrink-0">↵</span>
                <button onClick={() => { draftRef.current = ""; setDraft(""); }} className="text-slate-500 hover:text-slate-300 flex-shrink-0"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <span className="ml-auto text-[10px] text-slate-600 hidden sm:inline">Tast for at skrive</span>
            )}
          </div>
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div className="fixed z-[60] bg-slate-800 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden min-w-[200px] max-w-[240px]" style={{ left: ctxMenu.clientX, top: ctxMenu.clientY }} onClick={e => e.stopPropagation()}>

          {ctxMenu.kind === "self" && (
            <>
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <p className="text-[10px] font-semibold text-slate-500 mb-2">Ansigtsudtryk</p>
                <div className="flex gap-1">
                  {MOODS.map(m => (
                    <button key={m.id} onClick={() => { changeMood(m.id); setCtxMenu(null); }}
                      className={`flex-1 py-1.5 rounded text-base transition-all ${myMood === m.id ? "bg-violet-500/25 ring-1 ring-violet-500/50" : "bg-white/[0.04] hover:bg-white/[0.1]"}`}
                      title={m.label}>{m.emoji}</button>
                  ))}
                </div>
              </div>
              <div className="px-3 py-2 border-b border-white/[0.06]"><span className="text-xs font-semibold text-slate-300">Rygsæk ({myInventory.length})</span></div>
              {myInventory.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">Ingen genstande</p>}
              {myInventory.map(item => (
                <button key={item.id} onClick={() => dropItem(item)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.06] flex items-center gap-2">
                  <svg width="16" height="16" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg>
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="text-[10px] text-slate-500">Smid</span>
                </button>
              ))}
            </>
          )}

          {ctxMenu.kind === "bot" && ctxMenu.bot && (() => {
            const bot = ctxMenu.bot!;
            const givesItem = clothingCatalog.find(c => c.id === bot.gives_clothing_id);
            const alreadyOwned = givesItem && myWardrobe.some(w => w.clothing_id === bot.gives_clothing_id);
            return (
              <>
                <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: bot.color }} />
                  <span className="text-xs font-semibold text-slate-200 truncate">{bot.name}</span>
                  <Bot className="w-3 h-3 text-slate-500 flex-shrink-0" />
                </div>
                {givesItem && (
                  <button onClick={() => takeFromBot(bot)} disabled={alreadyOwned} className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${alreadyOwned ? "text-slate-600 cursor-not-allowed" : "text-emerald-400 hover:bg-emerald-500/10"}`}>
                    <span>🎁</span>
                    <span className="flex-1 truncate">{alreadyOwned ? "Allerede ejet" : `Hent ${givesItem.name}`}</span>
                  </button>
                )}
                {isAdmin && (
                  <div className="border-t border-white/[0.06]">
                    <button onClick={() => { setMovingBotId(bot.id); setCtxMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10">Flyt bot</button>
                    <button onClick={() => deleteBot(bot.id)} className="w-full text-left px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10">Slet bot</button>
                  </div>
                )}
              </>
            );
          })()}

          {ctxMenu.kind === "user" && ctxMenu.user && (() => {
            const theirItems = items.filter(i => i.owner_id === ctxMenu.user!.user_id);
            return (
              <>
                <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: ctxMenu.user.color }} />
                  <span className="text-xs font-semibold text-slate-200 truncate">{ctxMenu.user.display_name}</span>
                </div>
                <button className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]" onClick={() => openProfile(ctxMenu.user!.user_id)}>Se profil</button>
                {theirItems.length > 0 && (
                  <div className="border-t border-white/[0.06]">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Bærer ({theirItems.length})</p>
                    {theirItems.map(item => (
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
                        {myInventory.map(item => (
                          <button key={item.id} onClick={() => giveItem(item, ctxMenu.user!.user_id)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06] flex items-center gap-2">
                            <svg width="14" height="14" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg>
                            <span className="truncate">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-white/[0.06]">
                      <button className="w-full text-left px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10" onClick={() => kickUser(ctxMenu.user!)}>Kick bruger</button>
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
              <button className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]" onClick={() => pickupItem(ctxMenu.item!)}>Tag genstand</button>
              {isAdmin && <button className="w-full text-left px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10" onClick={() => deleteItem(ctxMenu.item!.id)}>Slet genstand</button>}
            </>
          )}
        </div>
      )}

      {profileView && <UserProfileModal profile={profileView} currentProfile={currentProfile} onClose={() => setProfileView(null)} />}
    </div>
  );
}
