"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Users, Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut, Hash, Wrench, Plus, Trash2, Pencil, Package, Minus, Shirt, Bot, LogOut, MessageSquare } from "lucide-react";
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
const WALL_H = 110;

// ─── Room design options ────────────────────────────────────────────────────────
const ROOM_THEMES: { id: string; label: string; color: string; even: string; odd: string; highlight: string; wallA: string; wallB: string }[] = [
  { id: "blue",      label: "Nat",     color: "#3b82f6", even: "#0f1a2e", odd: "#0c1525", highlight: "#231850", wallA: "#132038", wallB: "#0a1222" },
  { id: "green",     label: "Natur",   color: "#22c55e", even: "#0f1e10", odd: "#0c1a0d", highlight: "#1a3520", wallA: "#142814", wallB: "#0c1c0c" },
  { id: "purple",    label: "Lilla",   color: "#a855f7", even: "#1a1020", odd: "#15091a", highlight: "#2e1045", wallA: "#22142e", wallB: "#160d1e" },
  { id: "red",       label: "Rød",     color: "#ef4444", even: "#1e100f", odd: "#180d0c", highlight: "#351510", wallA: "#241412", wallB: "#160e0b" },
  { id: "orange",    label: "Varmt",   color: "#f97316", even: "#1e1508", odd: "#180f05", highlight: "#2e2210", wallA: "#241c0a", wallB: "#16110a" },
  { id: "cyan",      label: "Hav",     color: "#06b6d4", even: "#0e1e22", odd: "#0b181c", highlight: "#0e2e38", wallA: "#122630", wallB: "#0b1c24" },
  { id: "brown",     label: "Parket",  color: "#92400e", even: "#1c1208", odd: "#180f05", highlight: "#2e1f0a", wallA: "#201608", wallB: "#160f06" },
  { id: "pink",      label: "Rosa",    color: "#ec4899", even: "#1e0f18", odd: "#180c13", highlight: "#301528", wallA: "#22141e", wallB: "#160d16" },
  { id: "teal",      label: "Skov",    color: "#14b8a6", even: "#0e1c1a", odd: "#0b1615", highlight: "#102e2a", wallA: "#112422", wallB: "#0b1c1a" },
  { id: "dark",      label: "Mørk",    color: "#475569", even: "#080a0e", odd: "#060809", highlight: "#12151e", wallA: "#0b0d14", wallB: "#060810" },
];
const FLOOR_PATTERNS: { id: string; label: string }[] = [
  { id: "standard",     label: "Standard"  },
  { id: "checkerboard", label: "Skakbræt"  },
  { id: "diamond",      label: "Diamant"   },
  { id: "uniform",      label: "Ensfarvet" },
];

// ─── Room themes ───────────────────────────────────────────────────────────────
type RoomTheme = { id?: string; label?: string; color?: string; even: string; odd: string; highlight: string; wallA: string; wallB: string };
function getShopTheme(): RoomTheme {
  return { even: "#180f05", odd: "#130c04", highlight: "#2a1a06", wallA: "#201408", wallB: "#140d04" };
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
function ShopCounterSVG() {
  return (
    <g>
      <rect x="-20" y="-15" width="40" height="15" rx="2" fill="#1c1008" stroke="#3d2a10" strokeWidth="0.8" />
      <rect x="-17" y="-13" width="34" height="10" rx="1" fill="#0a0806" />
      <rect x="-14" y="-11" width="8" height="6" rx="0.5" fill="#3b82f6" opacity="0.45" />
      <rect x="-3" y="-11" width="8" height="6" rx="0.5" fill="#8b5cf6" opacity="0.45" />
      <rect x="8" y="-11" width="8" height="6" rx="0.5" fill="#ef4444" opacity="0.45" />
      <rect x="-20" y="-18" width="40" height="4" rx="1.5" fill="#4a3010" stroke="#5a3a14" strokeWidth="0.5" />
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
interface SpeechBubble { id: number; text: string; ts: number; }
interface ClothingItem {
  id: string;
  name: string;
  slot: string;
  style_key: string;
  color: string;
  price: number;
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
  room_type: string;
  theme_key: string;
  floor_pattern: string;
}
interface VirtualRoomProps {
  roomId: string;
  roomName: string;
  currentProfile: Profile;
  onClose: () => void;
}
type RightPanel = "chatlog" | "rooms" | "admin" | "inventory" | "online" | "wardrobe" | "shop";

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
  const coinsRef = useRef(1000);
  const lastCoinAwardRef = useRef<Date | null>(null);
  const lastTypingBroadcastRef = useRef(0);

  const myColor = currentProfile.avatar_color ?? "#8b5cf6";
  const isAdmin = currentProfile.role === "admin";

  const [activeRoomId, setActiveRoomId] = useState(roomId);
  const [activeRoomName, setActiveRoomName] = useState(roomName);
  const [roomCols, setRoomCols] = useState(DEFAULT_COLS);
  const [roomRows, setRoomRows] = useState(DEFAULT_ROWS);
  const [users, setUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [bubbles, setBubbles] = useState<Map<string, SpeechBubble[]>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const [typingFrame, setTypingFrame] = useState(0);
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
  const [activeThemeKey, setActiveThemeKey] = useState("blue");
  const [activeFloorPattern, setActiveFloorPattern] = useState("standard");
  const [createRoomForm, setCreateRoomForm] = useState<{ name: string; cols: number; rows: number; room_type: string; theme_key: string; floor_pattern: string } | null>(null);
  const [editRoomForm, setEditRoomForm] = useState<{ id: string; name: string; cols: number; rows: number; room_type: string; theme_key: string; floor_pattern: string } | null>(null);
  const [adminTab, setAdminTab] = useState<"items" | "bots">("items");
  const [createBotForm, setCreateBotForm] = useState<{ name: string; color: string; message: string; moves_randomly: boolean; gives_clothing_id: string } | null>(null);
  const [movingBotId, setMovingBotId] = useState<string | null>(null);
  const [coins, setCoins] = useState(1000);
  const [activeRoomType, setActiveRoomType] = useState("normal");
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const xpRef = useRef(0);
  const [wardrobeActiveSlot, setWardrobeActiveSlot] = useState<string | null>(null);
  const [wardrobePreviewId, setWardrobePreviewId] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [disconnectMsg, setDisconnectMsg] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(120);
  const lastHourConfirmRef = useRef(Date.now());
  const showConfirmModalRef = useRef(false);
  const disconnectedRef = useRef(false);
  const minuteXpAccRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { botsRef.current = bots; }, [bots]);
  useEffect(() => { usersRef.current = users; }, [users]);

  // ─── Activity / session timer ───────────────────────────────────────────────
  const triggerDisconnect = useCallback((msg: string) => {
    if (disconnectedRef.current) return;
    disconnectedRef.current = true;
    setDisconnectMsg(msg);
    setDisconnected(true);
  }, []);

  const confirmPresence = useCallback(async () => {
    showConfirmModalRef.current = false;
    setShowConfirmModal(false);
    lastHourConfirmRef.current = Date.now();
    const newCoins = coinsRef.current + 100;
    coinsRef.current = newCoins; setCoins(newCoins);
    await supabase.from("profiles").update({ coins: newCoins }).eq("id", currentProfile.id);
  }, [supabase, currentProfile.id]);

  // Inactivity + hourly check (every 30s)
  useEffect(() => {
    const check = setInterval(() => {
      if (disconnectedRef.current) return;
      const now = Date.now();
      if (now - lastActivityRef.current > 30 * 60 * 1000) {
        triggerDisconnect("Du har mistet forbindelsen til chatten");
        return;
      }
      if (!showConfirmModalRef.current && now - lastHourConfirmRef.current > 60 * 60 * 1000) {
        showConfirmModalRef.current = true;
        setShowConfirmModal(true);
        setConfirmCountdown(120);
      }
      // Time-based XP: +1 XP per minute (0.5 per 30s tick)
      minuteXpAccRef.current += 0.5;
      if (minuteXpAccRef.current >= 1) {
        const add = Math.floor(minuteXpAccRef.current);
        minuteXpAccRef.current -= add;
        const newXp = xpRef.current + add;
        xpRef.current = newXp;
        const newLevel = Math.floor(newXp / 100) + 1;
        setXp(newXp); setLevel(newLevel);
        supabase.from("profiles").update({ xp: newXp, level: newLevel }).eq("id", currentProfile.id);
      }
    }, 30_000);
    return () => clearInterval(check);
  }, [triggerDisconnect, supabase, currentProfile.id]);

  // Confirmation modal countdown
  useEffect(() => {
    if (!showConfirmModal) return;
    const cd = setInterval(() => {
      setConfirmCountdown(prev => {
        if (prev <= 1) {
          clearInterval(cd);
          triggerDisconnect("Du har mistet forbindelsen til chatten");
          setShowConfirmModal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cd);
  }, [showConfirmModal, triggerDisconnect]);

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

  const previewOutfit = useMemo<Record<string, string>>(() => {
    if (!wardrobePreviewId) return myOutfit;
    const item = clothingCatalog.find(c => c.id === wardrobePreviewId);
    if (!item) return myOutfit;
    return { ...myOutfit, [item.slot]: wardrobePreviewId };
  }, [myOutfit, wardrobePreviewId, clothingCatalog]);

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
    supabase.from("chat_rooms").select("id, name, cols, rows, room_type, theme_key, floor_pattern").order("name").then(({ data }) => {
      if (data) {
        const list = (data as ChatRoom[]).map(r => ({ ...r, cols: r.cols ?? DEFAULT_COLS, rows: r.rows ?? DEFAULT_ROWS, room_type: r.room_type ?? "normal", theme_key: r.theme_key ?? "blue", floor_pattern: r.floor_pattern ?? "standard" }));
        setRooms(list);
        const cur = list.find(r => r.id === roomId);
        if (cur) {
          setRoomDimensions(cur.cols, cur.rows);
          setActiveRoomType(cur.room_type);
          setActiveThemeKey(cur.theme_key ?? "blue");
          setActiveFloorPattern(cur.floor_pattern ?? "standard");
          if (cur.room_type === "shop") setRightPanel("shop");
        }
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
    supabase.from("profiles").select("coins, last_coin_award, xp, level").eq("id", currentProfile.id).single().then(({ data }) => {
      if (data) {
        if (data.xp != null) { xpRef.current = data.xp; setXp(data.xp); }
        if (data.level != null) setLevel(data.level);
        const c = (data as { coins: number; last_coin_award: string }).coins ?? 1000;
        coinsRef.current = c; setCoins(c);
        const la = (data as { coins: number; last_coin_award: string }).last_coin_award;
        if (la) lastCoinAwardRef.current = new Date(la);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hourly coin award (50 coins per active hour)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (Date.now() - lastActivityRef.current > 10 * 60 * 1000) return; // inactive
      const now = new Date();
      const last = lastCoinAwardRef.current;
      if (last && now.getTime() - last.getTime() < 60 * 60 * 1000) return; // too soon
      const newCoins = coinsRef.current + 50;
      coinsRef.current = newCoins; setCoins(newCoins); lastCoinAwardRef.current = now;
      await supabase.from("profiles").update({ coins: newCoins, last_coin_award: now.toISOString() }).eq("id", currentProfile.id);
    }, 60_000);
    return () => clearInterval(interval);
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
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { user_id: string };
        if (!p?.user_id || p.user_id === currentProfile.id) return;
        setTypingUsers(prev => { const m = new Map(prev); m.set(p.user_id, Date.now()); return m; });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoomId}` }, async (payload) => {
        const sid: string = payload.new.user_id; const txt: string = payload.new.content;
        const newBubble: SpeechBubble = { id: Date.now() + Math.random(), text: txt, ts: Date.now() };
        setBubbles(prev => { const m = new Map(prev); const existing = m.get(sid) ?? []; m.set(sid, [...existing.slice(-3), newBubble]); return m; });
        setTimeout(() => { setBubbles(prev => { const m = new Map(prev); const arr = m.get(sid); if (!arr) return prev; const f = arr.filter(b => b.id !== newBubble.id); if (f.length === 0) m.delete(sid); else m.set(sid, f); return m; }); }, 7000);
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
        if (draftRef.current.length >= 80) return;
        e.preventDefault();
        setDraft(prev => { const n = prev + e.key; draftRef.current = n; return n; });
        if (Date.now() - lastTypingBroadcastRef.current > 1500) {
          lastTypingBroadcastRef.current = Date.now();
          channelRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: currentProfile.id } });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Typing users cleanup + animation frame
  useEffect(() => {
    const cleanup = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now(); let changed = false;
        const m = new Map(prev);
        for (const [uid, ts] of Array.from(m.entries())) { if (now - ts > 3000) { m.delete(uid); changed = true; } }
        return changed ? m : prev;
      });
    }, 500);
    const frame = setInterval(() => setTypingFrame(f => (f + 1) % 3), 500);
    return () => { clearInterval(cleanup); clearInterval(frame); };
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

  const switchRoom = (id: string, name: string, cols?: number, rows?: number, roomType?: string, themeKey?: string, floorPattern?: string) => {
    const nc = cols ?? roomColsRef.current; const nr = rows ?? roomRowsRef.current;
    const rt = roomType ?? "normal";
    setActiveRoomId(id); setActiveRoomName(name); setRoomDimensions(nc, nr);
    setActiveRoomType(rt); setRightPanel(rt === "shop" ? "shop" : "chatlog");
    setActiveThemeKey(themeKey ?? "blue");
    setActiveFloorPattern(floorPattern ?? "standard");
    lastActivityRef.current = Date.now();
    myPosRef.current = { gx: Math.floor(Math.random() * nc), gy: Math.floor(Math.random() * nr) };
    setMyPos(myPosRef.current);
  };

  // ─── Shop / buy ────────────────────────────────────────────────────────────
  const buyItem = async (item: ClothingItem) => {
    if (coinsRef.current < item.price) return;
    if (myWardrobe.some(w => w.clothing_id === item.id)) return;
    const newCoins = coinsRef.current - item.price;
    coinsRef.current = newCoins; setCoins(newCoins);
    const tempEntry: UserWardrobeEntry = { id: "temp-" + Date.now(), clothing_id: item.id, equipped: false };
    setMyWardrobe(prev => [...prev, tempEntry]);
    await supabase.from("profiles").update({ coins: newCoins }).eq("id", currentProfile.id);
    const { data } = await supabase.from("virtual_user_wardrobe")
      .upsert({ user_id: currentProfile.id, clothing_id: item.id, equipped: false })
      .select("id, clothing_id, equipped").single();
    if (data) setMyWardrobe(prev => prev.map(w => w.id === tempEntry.id ? data as UserWardrobeEntry : w));
  };

  sendDraftRef.current = async () => {
    const t = draftRef.current.trim(); if (!t) return;
    draftRef.current = ""; setDraft(""); lastActivityRef.current = Date.now();
    await supabase.from("messages").insert({ content: t, user_id: currentProfile.id, room_id: activeRoomId });
    // Award +10 XP per message
    const newXp = xpRef.current + 10;
    const newLevel = Math.floor(newXp / 100) + 1;
    xpRef.current = newXp; setXp(newXp); setLevel(newLevel);
    await supabase.from("profiles").update({ xp: newXp, level: newLevel }).eq("id", currentProfile.id);
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

  // ─── Room creation / editing ───────────────────────────────────────────────
  const createRoom = async () => {
    if (!createRoomForm?.name.trim()) return;
    const { data } = await supabase.from("chat_rooms").insert({ name: createRoomForm.name.trim(), cols: createRoomForm.cols, rows: createRoomForm.rows, room_type: createRoomForm.room_type, theme_key: createRoomForm.theme_key, floor_pattern: createRoomForm.floor_pattern }).select("id, name, cols, rows, room_type, theme_key, floor_pattern").single();
    if (data) setRooms(prev => [...prev, data as ChatRoom].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateRoomForm(null);
  };

  const updateRoom = async () => {
    if (!editRoomForm?.name.trim()) return;
    await supabase.from("chat_rooms").update({ name: editRoomForm.name.trim(), cols: editRoomForm.cols, rows: editRoomForm.rows, room_type: editRoomForm.room_type, theme_key: editRoomForm.theme_key, floor_pattern: editRoomForm.floor_pattern }).eq("id", editRoomForm.id);
    setRooms(prev => prev.map(r => r.id === editRoomForm.id ? { ...r, ...editRoomForm, name: editRoomForm.name.trim() } : r).sort((a, b) => a.name.localeCompare(b.name)));
    if (editRoomForm.id === activeRoomId) {
      setActiveThemeKey(editRoomForm.theme_key);
      setActiveFloorPattern(editRoomForm.floor_pattern);
    }
    setEditRoomForm(null);
  };

  const reloadChat = useCallback(async () => {
    const [{ data: msgs }, { data: roomItems }, { data: roomBots }] = await Promise.all([
      supabase.from("messages").select("id, content, user_id, created_at, profiles(display_name, avatar_color)").eq("room_id", activeRoomId).eq("is_deleted", false).order("created_at", { ascending: false }).limit(50),
      supabase.from("virtual_room_items").select("*").eq("room_id", activeRoomId),
      supabase.from("virtual_room_bots").select("*").eq("room_id", activeRoomId),
    ]);
    if (msgs) setLogMessages((msgs as LogMessage[]).reverse());
    if (roomItems) setItems(roomItems as RoomItem[]);
    if (roomBots) setBots(roomBots as RoomBot[]);
    broadcastMove(myPosRef.current.gx, myPosRef.current.gy);
  }, [activeRoomId, broadcastMove]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    onClose();
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const theme = useMemo(() => activeRoomType === "shop" ? getShopTheme() : (ROOM_THEMES.find(t => t.id === activeThemeKey) ?? ROOM_THEMES[0]), [activeThemeKey, activeRoomType]);

  const roomOccupancy = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of Array.from(globalUsers.values())) m.set(u.room_id, (m.get(u.room_id) ?? 0) + 1);
    return m;
  }, [globalUsers]);

  const windowStyle = fullscreen
    ? { width: "100vw", height: "100vh", borderRadius: "0" }
    : { width: "min(96vw, 1040px)", height: "min(88vh, 660px)" };

  const renderTypingBubble = (ax: number, ay: number, yOffset: number = 0) => {
    const frames = ["●  ○  ○", "○  ●  ○", "○  ○  ●"];
    const bw = 50; const bh = 22;
    const bTop = ay - AR_S - 22 - bh - yOffset;
    return (
      <g>
        <rect x={ax - bw / 2} y={bTop} width={bw} height={bh} rx={11} fill="white" opacity={0.92} />
        <polygon points={`${ax - 4},${bTop + bh} ${ax + 4},${bTop + bh} ${ax},${bTop + bh + 7}`} fill="white" opacity={0.92} />
        <text x={ax} y={bTop + 15} textAnchor="middle" fontSize={9} fill="#374151" letterSpacing="1">{frames[typingFrame]}</text>
      </g>
    );
  };

  const renderSvgBubble = (ax: number, ay: number, text: string, _color: string, _opacity: number, yOffset: number = 0, showTail: boolean = true) => {
    const truncated = text.length > 80 ? text.slice(0, 80) + "…" : text;
    const words = truncated.split(" ");
    const lines: string[] = [];
    let cur = "";
    words.forEach(w => { const n = cur ? `${cur} ${w}` : w; if (n.length > 16 && cur) { lines.push(cur); cur = w; } else { cur = n; } });
    if (cur) lines.push(cur);
    const capped = lines.slice(0, 2);
    const lineH = 15;
    const padH = 10;
    const padV = 7;
    const bw = Math.min(160, Math.max(60, capped.reduce((m, l) => Math.max(m, l.length), 0) * 7 + padH * 2));
    const bh = capped.length * lineH + padV * 2;
    const bTop = ay - AR_S - 22 - bh - yOffset;
    return (
      <g>
        {/* Drop shadow */}
        <rect x={ax - bw / 2 + 1} y={bTop + 1} width={bw} height={bh} rx={8} fill="rgba(0,0,0,0.3)" />
        {/* White bubble */}
        <rect x={ax - bw / 2} y={bTop} width={bw} height={bh} rx={8} fill="white" />
        {/* Tail - only on newest (lowest) bubble */}
        {showTail && <polygon points={`${ax - 5},${bTop + bh} ${ax + 5},${bTop + bh} ${ax},${bTop + bh + 8}`} fill="white" />}
        {capped.map((line, i) => (
          <text key={i} x={ax} y={bTop + padV + 11 + i * lineH} textAnchor="middle" fontSize={11} fontFamily="system-ui,sans-serif" fontWeight="600" fill="#0f172a">{line}</text>
        ))}
      </g>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md" onClick={() => setCtxMenu(null)}>
      <div className="flex flex-col rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_120px_rgba(99,102,241,0.07)] border border-white/[0.1] overflow-hidden bg-gradient-to-b from-[#060d1a] to-[#04090f] max-sm:!w-screen max-sm:!h-[100dvh] max-sm:!rounded-none max-sm:border-0" style={windowStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-[#040c19]/95 border-b border-violet-500/20 shadow-[0_1px_0_rgba(99,102,241,0.06),0_4px_24px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 overflow-hidden">
            <span className="text-[15px] font-extrabold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent tracking-tight truncate max-w-[120px] sm:max-w-none">#{activeRoomName}</span>
            {activeRoomType === "shop" && <span className="hidden sm:inline-flex text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-semibold">🛍 Butik</span>}
            <span className="hidden sm:inline-flex text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">{totalUsers} online</span>
            <span className="text-[11px] text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full font-semibold">Lv.{level}</span>
            <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-semibold">🪙 {coins}</span>
            {movingBotId && <span className="hidden sm:inline-flex text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-semibold animate-pulse">Klik → placér bot</span>}
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setFullscreen(f => !f)} className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-all" title="Log ud"><LogOut className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all" title="Luk"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">

          {/* Isometric room */}
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative" style={{ background: theme.even }}>
            <svg viewBox={`${svgW / 2 - svgW / (2 * zoom)} ${svgH / 2 - svgH / (2 * zoom)} ${svgW / zoom} ${svgH / zoom}`}
              preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
              <rect width={svgW} height={svgH} fill={theme.even} />

              {/* ── Back walls ── */}
              {(() => {
                const tcx = svgW / 2;
                const tcy = OFFSET_Y - TH / 2;
                const rBR = { x: tcx + roomCols * TW / 2, y: tcy + roomCols * TH / 2 };
                const lBL = { x: tcx - roomRows * TW / 2, y: tcy + roomRows * TH / 2 };
                const apex = { x: tcx, y: tcy - WALL_H };
                return (
                  <g>
                    {/* Right wall (gy=0 edge) */}
                    <polygon
                      points={`${tcx},${tcy} ${rBR.x},${rBR.y} ${rBR.x},${rBR.y - WALL_H} ${apex.x},${apex.y}`}
                      fill={theme.wallA}
                    />
                    {/* Right wall baseboard */}
                    <polygon
                      points={`${tcx},${tcy} ${rBR.x},${rBR.y} ${rBR.x},${rBR.y - 12} ${tcx},${tcy - 12}`}
                      fill="rgba(0,0,0,0.25)"
                    />
                    {/* Right wall top stripe */}
                    <polygon
                      points={`${tcx},${tcy - WALL_H + 14} ${rBR.x},${rBR.y - WALL_H + 14} ${rBR.x},${rBR.y - WALL_H} ${apex.x},${apex.y}`}
                      fill="rgba(255,255,255,0.025)"
                    />
                    {/* Left wall (gx=0 edge) */}
                    <polygon
                      points={`${tcx},${tcy} ${lBL.x},${lBL.y} ${lBL.x},${lBL.y - WALL_H} ${apex.x},${apex.y}`}
                      fill={theme.wallB}
                    />
                    {/* Left wall baseboard */}
                    <polygon
                      points={`${tcx},${tcy} ${lBL.x},${lBL.y} ${lBL.x},${lBL.y - 12} ${tcx},${tcy - 12}`}
                      fill="rgba(0,0,0,0.3)"
                    />
                    {/* Left wall top stripe */}
                    <polygon
                      points={`${tcx},${tcy - WALL_H + 14} ${lBL.x},${lBL.y - WALL_H + 14} ${lBL.x},${lBL.y - WALL_H} ${apex.x},${apex.y}`}
                      fill="rgba(255,255,255,0.015)"
                    />
                    {/* Floor-wall shadow */}
                    <polygon
                      points={`${tcx},${tcy} ${rBR.x},${rBR.y} ${rBR.x},${rBR.y - 6} ${tcx},${tcy - 6}`}
                      fill="rgba(0,0,0,0.35)"
                    />
                    <polygon
                      points={`${tcx},${tcy} ${lBL.x},${lBL.y} ${lBL.x},${lBL.y - 6} ${tcx},${tcy - 6}`}
                      fill="rgba(0,0,0,0.4)"
                    />
                    {/* Wall border lines */}
                    <line x1={tcx} y1={tcy} x2={rBR.x} y2={rBR.y} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                    <line x1={tcx} y1={tcy} x2={lBL.x} y2={lBL.y} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                    {/* Ridge lines at top of walls */}
                    <line x1={apex.x} y1={apex.y} x2={rBR.x} y2={rBR.y - WALL_H} stroke="rgba(255,255,255,0.07)" strokeWidth={0.8} />
                    <line x1={apex.x} y1={apex.y} x2={lBL.x} y2={lBL.y - WALL_H} stroke="rgba(255,255,255,0.05)" strokeWidth={0.8} />
                    {/* Corner ridge */}
                    <line x1={tcx} y1={tcy} x2={apex.x} y2={apex.y} stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} />
                  </g>
                );
              })()}

              {sortedTiles.map(({ gx, gy }) => {
                const { x, y } = isoCenter(gx, gy, svgW);
                const cellKey = `${gx},${gy}`;
                const cellItem = itemsByCell.get(cellKey);
                const cellBot  = botsByCell.get(cellKey);
                const hasUser  = usersByCell.has(cellKey);
                const isHov = hovered === cellKey;
                const isMyTile = myPos.gx === gx && myPos.gy === gy;
                const isBotTarget = !!movingBotId && !cellBot;

                const baseFill = (() => {
                  switch (activeFloorPattern) {
                    case "checkerboard": return (Math.floor(gx / 2) + Math.floor(gy / 2)) % 2 === 0 ? theme.even : theme.odd;
                    case "diamond":      return (gx % 4 === 0 && gy % 4 === 0) || (gx % 4 === 2 && gy % 4 === 2) ? theme.highlight : (gx + gy) % 2 === 0 ? theme.even : theme.odd;
                    case "uniform":      return theme.even;
                    default:             return (gx + gy) % 2 === 0 ? theme.even : theme.odd;
                  }
                })();
                const tileFill = isMyTile ? theme.highlight : isBotTarget && isHov ? "#1a3020" : isHov ? "#192e4a" : baseFill;
                const tileStroke = isMyTile ? myColor : isBotTarget && isHov ? "#22c55e" : "#16243a";

                return (
                  <g key={cellKey}
                    onClick={() => handleTileClick(gx, gy)}
                    onContextMenu={e => handleRightClick(e, null, cellItem ?? null, cellBot ?? null)}
                    onMouseEnter={() => setHovered(cellKey)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: cellBot || hasUser ? "default" : movingBotId ? "crosshair" : "pointer" }}>
                    <polygon points={tilePts(x, y)} fill={tileFill} stroke={tileStroke} strokeWidth={isMyTile ? 1.5 : 0.7} />
                    {isHov && !hasUser && !cellBot && !movingBotId && <polygon points={tilePts(x, y)} fill="rgba(80,140,255,0.08)" stroke="rgba(80,140,255,0.25)" strokeWidth={0.8} />}

                    {/* Shop counter (gy=0 row) */}
                    {activeRoomType === "shop" && gy === 0 && (
                      <g transform={`translate(${x}, ${y - TH / 4})`}>
                        <ShopCounterSVG />
                      </g>
                    )}

                    {/* items + bots rendered in sprite pass below (z-order fix) */}

                  </g>
                );
              })}

              {/* ── Depth-sorted sprite layer: items + bots + users ── */}
              {(() => {
                type Sprite =
                  | { kind: "item"; item: RoomItem; gx: number; gy: number }
                  | { kind: "bot";  bot: RoomBot;   gx: number; gy: number }
                  | { kind: "user"; user: PresenceUser; gx: number; gy: number };
                const sprites: Sprite[] = [];
                items.filter(i => i.gx !== null && i.gy !== null).forEach(i => sprites.push({ kind: "item", item: i, gx: i.gx!, gy: i.gy! }));
                bots.forEach(b => sprites.push({ kind: "bot", bot: b, gx: b.gx, gy: b.gy }));
                Array.from(users.values()).forEach(u => sprites.push({ kind: "user", user: u, gx: u.gx, gy: u.gy }));
                sprites.sort((a, b) => {
                  const da = a.gx + a.gy + (a.kind === "user" ? 0.6 : a.kind === "bot" ? 0.4 : 0.2 * Math.min((a as { item: RoomItem }).item?.item_scale ?? 1, 1));
                  const db = b.gx + b.gy + (b.kind === "user" ? 0.6 : b.kind === "bot" ? 0.4 : 0.2 * Math.min((b as { item: RoomItem }).item?.item_scale ?? 1, 1));
                  return da - db;
                });
                return sprites.map(s => {
                  const { x, y } = isoCenter(s.gx, s.gy, svgW);
                  const ax = x; const ay = y - AR_S;
                  if (s.kind === "item") {
                    return (
                      <g key={`item-${s.item.id}`} onContextMenu={e => handleRightClick(e, null, s.item, null)}>
                        <g transform={`translate(${x}, ${y - TH / 4}) scale(${0.85 * (s.item.item_scale ?? 1)})`}>
                          <ItemSVG type={s.item.item_type} />
                        </g>
                      </g>
                    );
                  }
                  if (s.kind === "bot") {
                    const cellBot = s.bot;
                    return (
                      <g key={`bot-${cellBot.id}`} onContextMenu={e => handleRightClick(e, null, null, cellBot)}>
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
                    );
                  }
                  // user
                  const user = s.user;
                  const isMe = user.user_id === currentProfile.id;
                  const userBubbles = bubbles.get(user.user_id) ?? [];
                  const isTyping = !isMe && typingUsers.has(user.user_id);
                  return (
                    <g key={`user-${user.user_id}`}
                      onClick={() => handleTileClick(user.gx, user.gy)}
                      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); handleRightClick(e, user, null, null); }}>
                      <g style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform 0.38s cubic-bezier(0.22,1,0.36,1)" }}>
                        <ellipse cx={0} cy={0} rx={18} ry={5} fill="rgba(0,0,0,0.45)" />
                        <g transform={`translate(0,${-AR_S}) scale(${AVG_SCALE})`}>
                          <PersonAvatar color={user.color} glow={isMe} mood={user.mood} />
                          {user.outfit && Object.keys(user.outfit).length > 0 && (
                            <ClothingOverlay outfit={user.outfit} catalog={clothingCatalog} />
                          )}
                        </g>
                        <text x={0} y={-AR_S * 2 - 6} textAnchor="middle" fontSize={10} fontFamily="system-ui,sans-serif" fontWeight="700" stroke="rgba(0,0,0,0.95)" strokeWidth={3} fill="rgba(0,0,0,0.95)">{isMe ? "Du" : user.display_name}</text>
                        <text x={0} y={-AR_S * 2 - 6} textAnchor="middle" fontSize={10} fontFamily="system-ui,sans-serif" fontWeight="700" fill="white">{isMe ? "Du" : user.display_name}</text>
                        {isMe && draft && renderSvgBubble(0, -AR_S, draft + "…", "#475569", 0.85, 0, false)}
                        {isTyping && renderTypingBubble(0, -AR_S, 0)}
                        {userBubbles.length > 0 && (
                          <g>{renderSvgBubble(0, -AR_S, userBubbles[userBubbles.length - 1].text, user.color, 0.95, 0, true)}</g>
                        )}
                      </g>
                    </g>
                  );
                });
              })()}
            </svg>

            {/* Floating draft bubble */}
            {draft && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2.5 bg-[#040c19]/98 backdrop-blur-xl rounded-2xl border border-white/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.7)] max-w-[340px]">
                <span className="text-[13px] text-slate-200 flex-1 truncate font-medium">{draft}</span>
                <kbd className="text-[9px] text-slate-500 flex-shrink-0 bg-white/[0.07] border border-white/[0.08] px-1.5 py-0.5 rounded-md font-mono">↵</kbd>
                <button onClick={() => { draftRef.current = ""; setDraft(""); }} className="text-slate-600 hover:text-rose-400 flex-shrink-0 transition-colors ml-0.5"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Floating toolbar dock */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-2.5 py-2 bg-[#040c19]/98 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)]">
              <button onClick={() => { disconnectedRef.current = false; setDisconnected(false); reloadChat(); }} className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all" title="Genindlæs / Genopret forbindelse"><RefreshCw className="w-[18px] h-[18px]" /></button>
              <div className="w-px h-5 bg-white/[0.08] mx-1" />
              <button onClick={() => setRightPanel("chatlog")} className={`sm:hidden p-2 rounded-xl transition-all ${rightPanel === "chatlog" ? "text-violet-400 bg-violet-500/15" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Chat"><MessageSquare className="w-[18px] h-[18px]" /></button>
              <button onClick={() => setRightPanel(p => p === "online" ? "chatlog" : "online")} className={`p-2 rounded-xl transition-all relative ${rightPanel === "online" ? "text-emerald-400 bg-emerald-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Online">
                <Users className="w-[18px] h-[18px]" />
                {globalUsers.size > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold">{globalUsers.size}</span>}
              </button>
              <button onClick={() => setRightPanel(p => p === "wardrobe" ? "chatlog" : "wardrobe")} className={`p-2 rounded-xl transition-all ${rightPanel === "wardrobe" ? "text-violet-400 bg-violet-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Garderobe">
                <Shirt className="w-[18px] h-[18px]" />
              </button>
              <button onClick={() => setRightPanel(p => p === "inventory" ? "chatlog" : "inventory")} className={`p-2 rounded-xl transition-all relative ${rightPanel === "inventory" ? "text-violet-400 bg-violet-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Rygsæk">
                <Package className="w-[18px] h-[18px]" />
                {myInventory.length > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-violet-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold">{myInventory.length}</span>}
              </button>
              <button onClick={() => setRightPanel(p => p === "rooms" ? "chatlog" : "rooms")} className={`p-2 rounded-xl transition-all ${rightPanel === "rooms" ? "text-violet-400 bg-violet-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Rum"><Hash className="w-[18px] h-[18px]" /></button>
              {isAdmin && <button onClick={() => setRightPanel(p => p === "admin" ? "chatlog" : "admin")} className={`p-2 rounded-xl transition-all ${rightPanel === "admin" ? "text-rose-400 bg-rose-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Admin"><Wrench className="w-[18px] h-[18px]" /></button>}
              <div className="w-px h-5 bg-white/[0.08] mx-1" />
              <button onClick={() => setZoom(z => Math.min(2.5, parseFloat((z + 0.2).toFixed(1))))} className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all" title="Zoom ind"><ZoomIn className="w-[18px] h-[18px]" /></button>
              <span className="text-[10px] text-slate-600 w-7 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.max(0.4, parseFloat((z - 0.2).toFixed(1))))} className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all" title="Zoom ud"><ZoomOut className="w-[18px] h-[18px]" /></button>
            </div>
          </div>

          {/* Right panel */}
          <div className={`flex flex-col bg-[#030912]/98 border-white/[0.07] ${
            rightPanel === "chatlog"
              ? "sm:w-60 sm:flex-shrink-0 sm:border-l border-t sm:border-t-0 h-52 sm:h-auto flex-shrink-0"
              : "absolute inset-0 z-20 sm:relative sm:inset-auto sm:w-60 sm:flex-shrink-0 border-l"
          }`}>

            {/* Online users */}
            {rightPanel === "online" && (
              <>
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60">
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[11px] font-bold text-slate-300 tracking-wide">Online — {globalUsers.size}</span></div>
                  <button onClick={() => setRightPanel("chatlog")} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
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
                        {!inSameRoom && !isMe && <button onClick={() => { const r = rooms.find(r => r.id === u.room_id); if (r) switchRoom(r.id, r.name, r.cols, r.rows, r.room_type, r.theme_key, r.floor_pattern); }} className="text-[10px] text-slate-500 hover:text-violet-400 flex-shrink-0">Gå til</button>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Wardrobe */}
            {rightPanel === "wardrobe" && (() => {
              const activeSlotItems = wardrobeActiveSlot
                ? myWardrobe
                    .map(w => ({ w, item: clothingCatalog.find(c => c.id === w.clothing_id) }))
                    .filter(({ item }) => item?.slot === wardrobeActiveSlot)
                : [];
              const previewItem = wardrobePreviewId ? clothingCatalog.find(c => c.id === wardrobePreviewId) : null;
              return (
                <>
                  {/* Header */}
                  <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0 bg-[#030912]/60">
                    <span className="text-[11px] font-bold text-slate-300 tracking-wide">Garderobe</span>
                    <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>

                  {/* Avatar preview */}
                  <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-2 border-b border-white/[0.06] bg-gradient-to-b from-violet-500/[0.04] to-transparent">
                    <svg width="110" height="115" viewBox="-28 -60 56 100">
                      <ellipse cx="0" cy="38" rx="13" ry="3.5" fill="rgba(0,0,0,0.4)" />
                      <g transform="scale(1.8)">
                        <PersonAvatar color={myColor} glow={false} mood="happy" />
                        {Object.keys(previewOutfit).length > 0 && (
                          <ClothingOverlay outfit={previewOutfit} catalog={clothingCatalog} />
                        )}
                      </g>
                    </svg>
                    <span className="text-[10px] h-4 text-violet-400 font-medium mt-1">
                      {previewItem ? previewItem.name : "\u00a0"}
                    </span>
                  </div>

                  {/* Slot grid */}
                  <div className="flex-shrink-0 p-2 grid grid-cols-4 gap-1 border-b border-white/[0.06]">
                    {CLOTHING_SLOTS.map(slot => {
                      const isEquipped = slot.id in myOutfit;
                      const isActive = wardrobeActiveSlot === slot.id;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => { setWardrobeActiveSlot(s => s === slot.id ? null : slot.id); setWardrobePreviewId(null); }}
                          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all relative ${
                            isActive
                              ? "bg-violet-500/20 border border-violet-500/40 shadow-[0_0_10px_rgba(139,92,246,0.15)]"
                              : "hover:bg-white/[0.05] border border-transparent"
                          }`}
                        >
                          <span className="text-base leading-none">{slot.emoji}</span>
                          <span className={`text-[8px] font-medium leading-none ${isActive ? "text-violet-300" : "text-slate-500"}`}>{slot.label}</span>
                          {isEquipped && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-violet-500" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Items for selected slot */}
                  <div className="flex-1 overflow-y-auto py-1">
                    {!wardrobeActiveSlot && (
                      <p className="text-[11px] text-slate-600 text-center mt-8 px-3">
                        {myWardrobe.length === 0 ? "Ingen tøj endnu. Find en bot med 🎁." : "Klik på en slot for at se dit tøj"}
                      </p>
                    )}
                    {wardrobeActiveSlot && activeSlotItems.length === 0 && (
                      <p className="text-[11px] text-slate-600 text-center mt-8 px-3">Intet tøj i denne slot endnu.</p>
                    )}
                    {wardrobeActiveSlot && activeSlotItems.map(({ w, item }) => item && (
                      <div
                        key={w.id}
                        className={`mx-2 my-1 p-2.5 rounded-xl border transition-all ${
                          wardrobePreviewId === item.id
                            ? "border-violet-500/40 bg-violet-500/10"
                            : w.equipped
                            ? "border-violet-500/25 bg-violet-500/[0.06]"
                            : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]"
                        }`}
                        onMouseEnter={() => setWardrobePreviewId(item.id)}
                        onMouseLeave={() => setWardrobePreviewId(null)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-white/10" style={{ backgroundColor: item.color }} />
                          <span className={`text-[12px] font-medium flex-1 truncate ${w.equipped ? "text-violet-300" : "text-slate-300"}`}>{item.name}</span>
                          {w.equipped && <span className="text-[9px] text-violet-400 bg-violet-500/15 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">På</span>}
                        </div>
                        <div className="flex gap-1.5">
                          {w.equipped
                            ? <button onClick={() => unequip(w.clothing_id)} className="flex-1 text-[10px] py-1 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 font-medium transition-colors">Tag af</button>
                            : <button onClick={() => equip(w.clothing_id)} className="flex-1 text-[10px] py-1 rounded-lg bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 font-medium transition-colors">Tag på</button>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {/* Shop */}
            {rightPanel === "shop" && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Butik</span>
                    <span className="text-[11px] text-amber-400 font-semibold">🪙 {coins}</span>
                  </div>
                  <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {CLOTHING_SLOTS.map(slot => {
                    const slotItems = clothingCatalog.filter(c => c.slot === slot.id);
                    if (slotItems.length === 0) return null;
                    return (
                      <div key={slot.id} className="border-b border-white/[0.04]">
                        <div className="px-3 py-1.5 flex items-center gap-1.5">
                          <span className="text-sm">{slot.emoji}</span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{slot.label}</span>
                        </div>
                        {slotItems.map(item => {
                          const owned = myWardrobe.some(w => w.clothing_id === item.id);
                          const canAfford = coins >= item.price;
                          return (
                            <div key={item.id} className="px-3 py-1.5 flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                              <span className={`text-[11px] flex-1 truncate ${owned ? "text-violet-300" : canAfford ? "text-slate-300" : "text-slate-600"}`}>{item.name}</span>
                              {owned
                                ? <span className="text-[9px] text-emerald-500 flex-shrink-0">Ejet</span>
                                : <button onClick={() => buyItem(item)} disabled={!canAfford} className={`text-[9px] flex-shrink-0 px-1.5 py-0.5 rounded font-semibold transition-colors ${canAfford ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "text-slate-700 cursor-not-allowed"}`}>
                                    🪙 {item.price}
                                  </button>
                              }
                            </div>
                          );
                        })}
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
                    {isAdmin && <button onClick={() => setCreateRoomForm({ name: "", cols: 10, rows: 8, room_type: "normal", theme_key: "blue", floor_pattern: "standard" })} className="p-1 rounded text-slate-500 hover:text-emerald-400" title="Opret rum"><Plus className="w-3 h-3" /></button>}
                    <button onClick={() => setRightPanel("chatlog")} className="text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
                  </div>
                </div>
                {/* Room design form (shared for create + edit) */}
                {(createRoomForm || editRoomForm) && isAdmin && (() => {
                  const form = editRoomForm ?? createRoomForm!;
                  const isEdit = !!editRoomForm;
                  const set = isEdit
                    ? (v: typeof form) => setEditRoomForm(v as typeof editRoomForm)
                    : (v: typeof form) => setCreateRoomForm(v as typeof createRoomForm);
                  return (
                    <div className="px-3 py-2.5 border-b border-white/[0.06] bg-violet-500/[0.04] flex-shrink-0 overflow-y-auto max-h-[70%]">
                      <p className="text-[10px] font-bold text-slate-400 mb-2">{isEdit ? "Rediger rum" : "Nyt rum"}</p>
                      <input autoFocus value={form.name} onChange={e => set({ ...form, name: e.target.value })} onKeyDown={e => { if (e.key === "Escape") { isEdit ? setEditRoomForm(null) : setCreateRoomForm(null); } }} placeholder="Rum navn..." className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[11px] text-slate-100 outline-none mb-2 focus:border-violet-500/50" />
                      <div className="flex gap-1.5 mb-2">
                        <div className="flex-1"><p className="text-[9px] text-slate-500 mb-0.5">Bredde</p><input type="number" min={4} max={20} value={form.cols} onChange={e => set({ ...form, cols: Math.max(4, Math.min(20, parseInt(e.target.value) || 10)) })} className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-violet-500/50" /></div>
                        <div className="flex-1"><p className="text-[9px] text-slate-500 mb-0.5">Dybde</p><input type="number" min={4} max={16} value={form.rows} onChange={e => set({ ...form, rows: Math.max(4, Math.min(16, parseInt(e.target.value) || 8)) })} className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-violet-500/50" /></div>
                      </div>
                      <p className="text-[9px] text-slate-500 mb-0.5">Type</p>
                      <select value={form.room_type} onChange={e => set({ ...form, room_type: e.target.value })} className="w-full bg-[#0a1220] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-slate-300 outline-none mb-2">
                        <option value="normal">Normal</option>
                        <option value="shop">Butik</option>
                      </select>
                      <p className="text-[9px] text-slate-500 mb-1">Farvetema</p>
                      <div className="grid grid-cols-5 gap-1.5 mb-2">
                        {ROOM_THEMES.map(t => (
                          <button key={t.id} onClick={() => set({ ...form, theme_key: t.id })} title={t.label}
                            className={`w-full aspect-square rounded-lg border-2 transition-all ${form.theme_key === t.id ? "border-white scale-110" : "border-transparent hover:border-white/40"}`}
                            style={{ backgroundColor: t.color }} />
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-500 mb-1">Gulvmønster</p>
                      <div className="grid grid-cols-2 gap-1 mb-2.5">
                        {FLOOR_PATTERNS.map(p => (
                          <button key={p.id} onClick={() => set({ ...form, floor_pattern: p.id })}
                            className={`py-1 rounded-lg text-[10px] font-medium transition-all ${form.floor_pattern === p.id ? "bg-violet-500/30 text-violet-200 border border-violet-500/50" : "bg-white/[0.04] text-slate-400 border border-transparent hover:border-white/10"}`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-600 mb-2">{form.cols * form.rows} felter</p>
                      <div className="flex gap-1">
                        <button onClick={isEdit ? updateRoom : createRoom} className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-[10px] font-semibold text-white transition-colors">{isEdit ? "Gem" : "Opret"}</button>
                        <button onClick={() => { isEdit ? setEditRoomForm(null) : setCreateRoomForm(null); }} className="flex-1 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-[10px] text-slate-300 transition-colors">Annuller</button>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex-1 overflow-y-auto py-1">
                  {rooms.length === 0 && <p className="text-[11px] text-slate-600 text-center mt-4">Ingen rum fundet</p>}
                  {rooms.map(r => {
                    const occ = roomOccupancy.get(r.id) ?? 0;
                    const rtheme = ROOM_THEMES.find(t => t.id === (r.theme_key ?? "blue"));
                    return (
                      <div key={r.id} className={`flex items-center gap-1 transition-colors ${r.id === activeRoomId ? "bg-violet-500/15" : "hover:bg-white/[0.03]"}`}>
                        <button onClick={() => switchRoom(r.id, r.name, r.cols, r.rows, r.room_type, r.theme_key, r.floor_pattern)}
                          className="flex-1 text-left px-3 py-2 text-[12px] flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: rtheme?.color ?? "#475569" }} />
                          <span className={`flex-1 truncate ${r.id === activeRoomId ? "text-violet-300" : "text-slate-300"}`}>{r.name}</span>
                          <span className={`text-[10px] flex-shrink-0 ${occ > 0 ? "text-emerald-500" : "text-slate-700"}`}>{occ}</span>
                        </button>
                        {isAdmin && <button onClick={() => { setCreateRoomForm(null); setEditRoomForm({ id: r.id, name: r.name, cols: r.cols, rows: r.rows, room_type: r.room_type, theme_key: r.theme_key ?? "blue", floor_pattern: r.floor_pattern ?? "standard" }); }} className="p-1.5 mr-1 rounded text-slate-600 hover:text-violet-400 flex-shrink-0 transition-colors" title="Rediger rum"><Pencil className="w-3 h-3" /></button>}
                      </div>
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

        {/* ── Disconnect overlay ── */}
        {disconnected && (
          <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-[#04090f]/96 backdrop-blur-sm">
            <div className="text-4xl mb-4">🔌</div>
            <p className="text-[17px] font-bold text-white mb-2 text-center px-6">{disconnectMsg}</p>
            <p className="text-[12px] text-slate-500 mb-6 text-center px-8">Tryk på genindlæs-knappen for at genopret forbindelsen</p>
            <button
              onClick={() => { disconnectedRef.current = false; setDisconnected(false); lastActivityRef.current = Date.now(); reloadChat(); }}
              className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-[13px] font-semibold text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Genopret forbindelse
            </button>
          </div>
        )}

        {/* ── Hourly confirmation modal ── */}
        {showConfirmModal && !disconnected && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0d1526] border border-violet-500/30 rounded-2xl p-6 max-w-[320px] w-[90%] shadow-2xl text-center">
              <div className="text-3xl mb-3">⏰</div>
              <p className="text-[15px] font-bold text-white mb-1.5">Er du stadig her?</p>
              <p className="text-[12px] text-slate-400 mb-4">Bekræft din tilstedeværelse for at forblive tilkoblet og modtage <span className="text-amber-400 font-semibold">🪙 100 mønter</span>.</p>
              <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-4 overflow-hidden">
                <div className="h-full bg-violet-500 transition-all duration-1000" style={{ width: `${(confirmCountdown / 120) * 100}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mb-5">{confirmCountdown}s tilbage</p>
              <button
                onClick={confirmPresence}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-[13px] font-bold text-white transition-colors"
              >
                Ja, jeg er her! 👋
              </button>
            </div>
          </div>
        )}

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
