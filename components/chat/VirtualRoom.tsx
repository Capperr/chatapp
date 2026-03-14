"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Users, Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut, Hash, Wrench, Plus, Trash2, Pencil, Package, Minus, Shirt, Bot, LogOut, MessageSquare, VolumeX, Volume2, Ban, Shield, ShieldOff, UserCheck, Settings, Rocket, Trophy, Mail, Send, ChevronLeft, Check, CheckCheck, Eye, EyeOff, Search, User, ArrowLeftRight, Gift } from "lucide-react";
import type { Profile, Achievement } from "@/types";
import { UserProfileModal } from "./UserProfileModal";

// ─── Grid constants ────────────────────────────────────────────────────────────
const TW = 80;
const TH = 40;
const AR = 20;
const AVG_SCALE = 1.4;
const AR_S = Math.round(AR * AVG_SCALE);
const WALL_H = 110;
const OFFSET_Y = TH / 2 + WALL_H + 20; // = 150, so apex (OFFSET_Y - TH/2 - WALL_H = 20) is never clipped
const DEFAULT_COLS = 10;
const DEFAULT_ROWS = 8;

// ─── Room design options ────────────────────────────────────────────────────────
const ROOM_THEMES: { id: string; label: string; color: string; even: string; odd: string; highlight: string; wallA: string; wallB: string }[] = [
  { id: "blue",   label: "Void",    color: "#818cf8", even: "#141a2e", odd: "#0f1422", highlight: "#1e2a50", wallA: "#1c2646", wallB: "#141c38" },
  { id: "cyan",   label: "Plasma",  color: "#22d3ee", even: "#0a1e28", odd: "#071620", highlight: "#0e3040", wallA: "#0e2e40", wallB: "#091e2e" },
  { id: "purple", label: "Nebula",  color: "#c084fc", even: "#180e28", odd: "#120a1e", highlight: "#281644", wallA: "#221038", wallB: "#180c2a" },
  { id: "green",  label: "Matrix",  color: "#4ade80", even: "#0a1e0e", odd: "#071608", highlight: "#103818", wallA: "#0e2a12", wallB: "#091e0a" },
  { id: "orange", label: "Inferno", color: "#fb923c", even: "#220e02", odd: "#180a01", highlight: "#381602", wallA: "#2e1004", wallB: "#200c02" },
  { id: "red",    label: "Abyss",   color: "#f43f5e", even: "#200608", odd: "#180406", highlight: "#341018", wallA: "#2a0810", wallB: "#1c040c" },
  { id: "teal",   label: "Arktis",  color: "#2dd4bf", even: "#081e1c", odd: "#061614", highlight: "#0e3430", wallA: "#0e2c28", wallB: "#081e1c" },
  { id: "pink",   label: "Aurora",  color: "#f472b6", even: "#200e20", odd: "#180a18", highlight: "#341436", wallA: "#2a1030", wallB: "#1e0c22" },
  { id: "brown",  label: "Guld",    color: "#fbbf24", even: "#1e1604", odd: "#160e02", highlight: "#342200", wallA: "#281802", wallB: "#1c1001" },
  { id: "dark",   label: "Stealth", color: "#94a3b8", even: "#0e1018", odd: "#0a0c14", highlight: "#181e2e", wallA: "#141824", wallB: "#0e1018" },
];
const FLOOR_PATTERNS: { id: string; label: string }[] = [
  { id: "standard",     label: "Standard"  },
  { id: "checkerboard", label: "Skakbræt"  },
  { id: "diamond",      label: "Diamant"   },
  { id: "uniform",      label: "Ensfarvet" },
  { id: "grid",         label: "Grid"      },
];

// ─── Solarie tan levels ────────────────────────────────────────────────────────
const TAN_LEVELS = [
  null,
  { color: "#c8956c", opacity: 0.32, label: "Mild solbrun",    minMinutes: 15  },
  { color: "#a0714f", opacity: 0.52, label: "Solbrun",         minMinutes: 30  },
  { color: "#8b4513", opacity: 0.68, label: "Solbrændt",       minMinutes: 60  },
  { color: "#5c2b0f", opacity: 0.84, label: "Meget solbrændt", minMinutes: 120 },
] as const;
function tanLevelFromMinutes(m: number): number {
  if (m >= 120) return 4; if (m >= 60) return 3; if (m >= 30) return 2; if (m >= 15) return 1; return 0;
}

// ─── Level system (based on cumulative hours online) ───────────────────────────
// Cumulative hours required to reach each level (index = level - 1)
const LEVEL_HOURS = [0, 1, 3, 8, 20, 50, 100, 140, 190, 250, 320, 400, 500, 650, 850];
function levelFromSeconds(totalSeconds: number): number {
  const h = totalSeconds / 3600;
  let lv = 1;
  for (let i = 1; i < LEVEL_HOURS.length; i++) {
    if (h >= LEVEL_HOURS[i]) lv = i + 1; else break;
  }
  return lv;
}
function hoursToNextLevel(totalSeconds: number): number {
  const h = totalSeconds / 3600;
  const lv = levelFromSeconds(totalSeconds);
  return lv < LEVEL_HOURS.length ? LEVEL_HOURS[lv] - h : 0;
}

// ─── XP-based level system ─────────────────────────────────────────────────────
// Cumulative XP needed to reach each level (index 0 = level 1 = 0 XP)
const XP_LEVELS = [0, 100, 300, 600, 1000, 1500, 2100, 2850, 3750, 4900, 6300, 8000, 10000, 12500, 15500];
function levelFromXp(xp: number): number {
  let lv = 1;
  for (let i = 1; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i]) lv = i + 1; else break;
  }
  return lv;
}
function xpInCurrentLevel(xp: number): number {
  const lv = levelFromXp(xp);
  return xp - (XP_LEVELS[lv - 1] ?? 0);
}
function xpForNextLevel(xp: number): number {
  const lv = levelFromXp(xp);
  if (lv >= XP_LEVELS.length) return 0;
  return XP_LEVELS[lv] - (XP_LEVELS[lv - 1] ?? 0);
}

// ─── Roulette constants ─────────────────────────────────────────────────────────
const ROULETTE_RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const ROULETTE_WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const ROULETTE_ROUND_MS = 25000; // 25s per round: 15s bet + 5s spin + 5s result
const ROULETTE_BET_MS   = 15000; // 15s betting phase
const ROULETTE_SPIN_END = 20000; // spin ends at 20s
function rouletteColor(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return ROULETTE_RED.has(n) ? "red" : "black";
}
function roulettePayout(betType: string, betValue: string, result: number): number {
  const col = rouletteColor(result);
  switch (betType) {
    case "number": return parseInt(betValue) === result ? 36 : 0;
    case "red":    return col === "red"   ? 2 : 0;
    case "black":  return col === "black" ? 2 : 0;
    case "green":  return result === 0 ? 36 : 0;
    case "odd":    return result > 0 && result % 2 === 1 ? 2 : 0;
    case "even":   return result > 0 && result % 2 === 0 ? 2 : 0;
    case "low":    return result >= 1 && result <= 18 ? 2 : 0;
    case "high":   return result >= 19 && result <= 36 ? 2 : 0;
    case "dozen1": return result >= 1  && result <= 12 ? 3 : 0;
    case "dozen2": return result >= 13 && result <= 24 ? 3 : 0;
    case "dozen3": return result >= 25 && result <= 36 ? 3 : 0;
    case "col1":   return result > 0 && result % 3 === 1 ? 3 : 0;
    case "col2":   return result > 0 && result % 3 === 2 ? 3 : 0;
    case "col3":   return result > 0 && result % 3 === 0 ? 3 : 0;
    default: return 0;
  }
}
function rouletteWheelAngleForResult(result: number): number {
  const idx = ROULETTE_WHEEL_ORDER.indexOf(result);
  return idx < 0 ? 0 : (idx / 37) * 360;
}

// ─── Dart mini-game ─────────────────────────────────────────────────────────
const DART_WHEEL = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const DART_ADJACENTS: Record<number,number[]> = {
  20:[1,5], 1:[20,18], 18:[1,4], 4:[18,13], 13:[4,6], 6:[13,10],
  10:[6,15], 15:[10,2], 2:[15,17], 17:[2,3], 3:[17,19], 19:[3,7],
  7:[19,16], 16:[7,8], 8:[16,11], 11:[8,14], 14:[11,9], 9:[14,12],
  12:[9,5], 5:[12,20]
};
function simulateDartThrow(remainingScore: number): { segment: number; multiplier: number; points: number } {
  const isFinish = remainingScore <= 60;
  const r = Math.random();
  if (r < 0.08) return { segment: 0, multiplier: 1, points: 0 };
  if (r < 0.10) return { segment: 50, multiplier: 2, points: 50 };
  if (r < 0.14) return { segment: 25, multiplier: 1, points: 25 };
  const weights = DART_WHEEL.map((s, i) => ({ s, w: 20 - i * 0.4 }));
  const total = weights.reduce((a, b) => a + b.w, 0);
  let pick = Math.random() * total; let seg = 20;
  for (const { s, w } of weights) { pick -= w; if (pick <= 0) { seg = s; break; } }
  if (Math.random() < 0.25) { const adj = DART_ADJACENTS[seg]; if (adj) seg = adj[Math.floor(Math.random() * adj.length)]; }
  let mult: number;
  if (isFinish) { const m = Math.random(); mult = m < 0.28 ? 2 : m < 0.55 ? 1 : 3; }
  else { const m = Math.random(); mult = m < 0.60 ? 1 : m < 0.85 ? 3 : 2; }
  return { segment: seg, multiplier: mult, points: seg * mult };
}

// ─── Room themes ───────────────────────────────────────────────────────────────
type RoomTheme = { id?: string; label?: string; color?: string; even: string; odd: string; highlight: string; wallA: string; wallB: string };
function getShopTheme(): RoomTheme {
  return { color: "#fbbf24", even: "#0f0802", odd: "#0c0601", highlight: "#241402", wallA: "#180e02", wallB: "#0c0901" };
}

// ─── Mini room isometric preview ───────────────────────────────────────────────
function MiniRoomPreview({ cols, rows, themeKey }: { cols: number; rows: number; themeKey: string }) {
  const theme = ROOM_THEMES.find(t => t.id === themeKey) ?? ROOM_THEMES[0];
  const TW = 14, TH = 7;
  const c = Math.min(cols, 10), r = Math.min(rows, 8);
  const vx = -(r - 1) * TW / 2 - 1;
  const vy = -1;
  const vw = (c + r - 1) * TW / 2 + TW + 2;
  const vh = (c + r - 1) * TH / 2 + TH + 2;
  return (
    <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} style={{ width: "100%", height: "100%" }}>
      {Array.from({ length: r }, (_, gy) =>
        Array.from({ length: c }, (_, gx) => {
          const x = (gx - gy) * TW / 2;
          const y = (gx + gy) * TH / 2;
          const isEven = (gx + gy) % 2 === 0;
          return (
            <polygon
              key={`${gx}-${gy}`}
              points={`${x + TW / 2},${y} ${x + TW},${y + TH / 2} ${x + TW / 2},${y + TH} ${x},${y + TH / 2}`}
              fill={isEven ? theme.even : theme.odd}
              stroke={theme.highlight}
              strokeWidth="0.5"
            />
          );
        })
      )}
    </svg>
  );
}

// ─── Person Avatar ─────────────────────────────────────────────────────────────
const AVATAR_TINT_COLORS = ["#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#3b82f6","#84cc16","#f97316","#14b8a6"];
function PersonAvatar({ color, tanLevel }: { color: string; glow?: boolean; mood?: string; tanLevel?: number }) {
  const filterId = (color && color !== "none" && AVATAR_TINT_COLORS.includes(color)) ? `alien-tint-${color.slice(1)}` : undefined;
  const tan = tanLevel && tanLevel > 0 ? TAN_LEVELS[tanLevel] : null;
  return (
    <g>
      <image href="/alien.png" x="-31" y="-36" width="62" height="77" filter={filterId ? `url(#${filterId})` : undefined} />
      {tan && <image href="/alien.png" x="-31" y="-36" width="62" height="77" filter={`url(#suntan-${tanLevel})`} opacity={tan.opacity} />}
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
    // ── Image-based clothing (PNG overlays) ──────────────────────────────────
    case "hair_dark_spiky": return (
      <image href="/clothing/hair_dark_spiky.png" x="-31" y="-36" width="62" height="77" />
    );
    case "jacket_tactical": return (
      <image href="/clothing/jacket_tactical.png" x="-31" y="-36" width="62" height="77" />
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

function PaintingSVG() {
  return (
    <g>
      <rect x="-14" y="-10" width="28" height="20" rx="1" fill="#5D2E0C" />
      <rect x="-11" y="-7" width="22" height="14" fill="#E8D5B0" />
      <rect x="-11" y="1" width="22" height="6" fill="#87CEEB" opacity="0.7" />
      <ellipse cx="0" cy="2" rx="5" ry="4" fill="#228B22" />
      <circle cx="-6" cy="4" r="2" fill="#228B22" opacity="0.7" />
      <line x1="-11" y1="1" x2="11" y2="1" stroke="#C8B48A" strokeWidth="0.5" />
    </g>
  );
}
function PosterSVG() {
  return (
    <g>
      <rect x="-11" y="-16" width="22" height="32" rx="1" fill="#1a1a2e" />
      <rect x="-11" y="-16" width="22" height="32" rx="1" fill="#3b82f6" opacity="0.3" />
      <text x="0" y="-2" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">★</text>
      <line x1="-7" y1="4" x2="7" y2="4" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="-5" y1="8" x2="5" y2="8" stroke="white" strokeWidth="0.8" opacity="0.4" />
      <rect x="-11" y="-16" width="22" height="32" rx="1" fill="none" stroke="#60a5fa" strokeWidth="0.8" />
    </g>
  );
}

const ITEM_TYPES = [
  { type: "flower",   label: "Blomst",     color: "#fb7185", wall: false, value: 50  },
  { type: "tv",       label: "TV",         color: "#1d4ed8", wall: false, value: 200 },
  { type: "desk",     label: "Skrivebord", color: "#92400e", wall: false, value: 150 },
  { type: "mailbox",  label: "Postkasse",  color: "#dc2626", wall: false, value: 75  },
  { type: "coffee",   label: "Kaffe",      color: "#f97316", wall: false, value: 100 },
  { type: "sofa",     label: "Sofa",       color: "#4f46e5", wall: false, value: 300 },
  { type: "painting", label: "Maleri",     color: "#d4a017", wall: true,  value: 250 },
  { type: "poster",   label: "Plakat",     color: "#3b82f6", wall: true,  value: 120 },
];

function ItemSVG({ type }: { type: string }) {
  switch (type) {
    case "flower": return <FlowerSVG />;
    case "tv": return <TVSVG />;
    case "desk": return <DeskSVG />;
    case "mailbox": return <MailboxSVG />;
    case "coffee": return <CoffeeSVG />;
    case "sofa":     return <SofaSVG />;
    case "painting": return <PaintingSVG />;
    case "poster":   return <PosterSVG />;
    default: return <circle r="8" fill="#6b7280" />;
  }
}

function isWallItemType(t: string) { return t === "painting" || t === "poster" || t === "dartboard"; }

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
  tan_level?: number;
  name_color?: string | null;
  aura_color?: string | null;
  bubble_color?: string | null;
  invisible?: boolean;
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
  kind: "user" | "self" | "tile_item" | "bot" | "tile" | "wall" | "portal" | "dartboard" | "dartscoreboard";
  user?: PresenceUser;
  item?: RoomItem;
  bot?: RoomBot;
  tileGx?: number;
  tileGy?: number;
  wallSide?: "left" | "right";
  wallPosition?: number;
  portal?: RoomPortal;
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
  rotation: number;
  wall_side: string | null;
  wall_pos: number;
  wall_height: number;
}
interface GlobalUser {
  user_id: string;
  display_name: string;
  color: string;
  room_id: string;
  room_name: string;
  outfit?: Record<string, string>;
  is_admin?: boolean;
  room_joined_at?: number; // ms timestamp
  last_activity?: number;  // ms timestamp
}
interface ChatRoom {
  id: string;
  name: string;
  cols: number;
  rows: number;
  room_type: string;
  theme_key: string;
  floor_pattern: string;
  owner_id?: string | null;
  spaceship_design?: string | null;
  spaceship_passcode?: string | null;
  roulette_gx?: number | null;
  roulette_gy?: number | null;
  roulette_scale?: number | null;
}
interface VisitRequest { from_id: string; from_name: string; spaceship_room_id: string; spaceship_room_name: string; }
interface TradeOffer { coins: number; clothing_ids: string[]; item_ids: string[]; }
interface TradeSession {
  trade_id: string;
  partner_id: string; partner_name: string; partner_color: string;
  my_offer: TradeOffer; their_offer: TradeOffer;
  my_confirmed: boolean; their_confirmed: boolean;
}
interface TradeRequest { from_id: string; from_name: string; from_color: string; trade_id: string; }

interface RouletteRound {
  id: number;
  room_id: string;
  result: number;
}

interface RoomPortal {
  id: string;
  room_id: string;
  wall_side: "left" | "right";
  portal_type: "door" | "window";
  position: number;
  size: 1 | 2 | 3;
  target_room_id?: string | null;
}
interface RouletteBet {
  id: string;
  round_id: number;
  room_id: string;
  user_id: string;
  display_name: string;
  avatar_color?: string | null;
  bet_type: string;
  bet_value: string;
  amount: number;
  payout?: number | null;
  won?: boolean | null;
  resolved?: boolean;
  created_at?: string | null;
}

interface DartGame {
  id: string; room_id: string; item_id: string;
  game_type: 201 | 301 | 501;
  player1_id: string; player2_id: string;
  player1_name: string; player2_name: string;
  player1_score: number; player2_score: number;
  current_player_id: string; throws_this_turn: number;
  status: "pending" | "active" | "finished";
  winner_id?: string | null; created_at: string;
}
interface DartThrow {
  id: string; game_id: string; player_id: string;
  throw_number: number; segment: number; multiplier: number;
  points: number; score_before: number; score_after: number;
  is_bust: boolean; created_at: string;
}

const SPACESHIP_VARIANTS: { id: string; name: string; emoji: string; desc: string; cols: number; rows: number; theme: string; price: number }[] = [
  { id: "scout",    name: "Scout",    emoji: "🛸", desc: "Kompakt og hurtigt",      cols: 8,  rows: 6,  theme: "blue",   price: 2000  },
  { id: "cruiser",  name: "Cruiser",  emoji: "🚀", desc: "Komfortabelt og rummeligt", cols: 10, rows: 8,  theme: "cyan",   price: 4500  },
  { id: "flagship", name: "Flagship", emoji: "🌌", desc: "Massivt og imponerende",   cols: 12, rows: 10, theme: "purple", price: 9000  },
  { id: "titan",    name: "Titan",    emoji: "⚡", desc: "Det ultimative rumskib",   cols: 14, rows: 12, theme: "dark",   price: 18000 },
];
interface VirtualRoomProps {
  roomId: string;
  roomName: string;
  initialRoomType?: string;
  initialRoomOwnerId?: string | null;
  currentProfile: Profile;
  onClose: () => void;
  onKicked?: (by: string) => void;
}
type RightPanel = "chatlog" | "hidden" | "rooms" | "admin" | "inventory" | "online" | "wardrobe" | "shop" | "profile" | "userprofile" | "settings" | "achievements" | "dms" | "dm_chat" | "roulette";

interface DmConversation {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_color: string;
  last_message_at: string;
  unread_count: number;
  last_preview: string;
}
interface DmMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function VirtualRoom({ roomId, roomName, initialRoomType, initialRoomOwnerId, currentProfile, onClose, onKicked }: VirtualRoomProps) {
  // Store client in a ref so it never changes reference between renders.
  // createBrowserClient creates a new object each call, which would cause
  // useEffect dependency arrays to see a "changed" value on every render,
  // resetting any intervals that list `supabase` as a dependency.
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
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
  const roomJoinedAtRef = useRef<number>(Date.now());
  const userLastActivityRef = useRef<Map<string, number>>(new Map());
  const botsRef = useRef<RoomBot[]>([]);
  const usersRef = useRef<Map<string, PresenceUser>>(new Map());
  const coinsRef = useRef(1000);
  const lastCoinAwardRef = useRef<Date | null>(null);
  const lastTypingBroadcastRef = useRef(0);

  const [myColor, setMyColor] = useState(currentProfile.avatar_color ?? "#8b5cf6");
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
  const [profileViewAchievements, setProfileViewAchievements] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rightPanel, setRightPanel] = useState<RightPanel>("hidden");
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
  const [showLevelGuide, setShowLevelGuide] = useState(false);
  const [otherLevelUps, setOtherLevelUps] = useState<Map<string, number>>(new Map());
  const [rouletteWinEffects, setRouletteWinEffects] = useState<Map<string, number>>(new Map());
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [myMutedUntil, setMyMutedUntil] = useState<string | null>(null);
  const myMutedUntilRef = useRef<string | null>(null);
  const [mySpaceship, setMySpaceship] = useState<ChatRoom | null>(null);
  const [spaceshipOf, setSpaceshipOf] = useState<Map<string, { id: string; name: string }>>(new Map());
  const [visitRequest, setVisitRequest] = useState<VisitRequest | null>(null);
  const [awaitingVisit, setAwaitingVisit] = useState(false);
  const [tradeRequest, setTradeRequest] = useState<TradeRequest | null>(null);
  const [tradePendingPartner, setTradePendingPartner] = useState<{ partner_id: string; partner_name: string; partner_color: string; trade_id: string } | null>(null);
  const [tradeSession, setTradeSession] = useState<TradeSession | null>(null);
  const [partnerWardrobe, setPartnerWardrobe] = useState<{ id: string; clothing_id: string }[]>([]);
  const [partnerInventory, setPartnerInventory] = useState<{ id: string; name: string; item_type: string }[]>([]);
  const [viewingInventory, setViewingInventory] = useState<{ userId: string; name: string; color: string; items: RoomItem[] } | null>(null);
  const [tradeTooltip, setTradeTooltip] = useState<{ x: number; y: number; item_id: string; is_clothing: boolean } | null>(null);
  const tradeSessionRef = useRef<TradeSession | null>(null);
  const [settingsTab, setSettingsTab] = useState<"shop" | "profil">("shop");
  const levelRef = useRef(1);
  const [tanLevel, setTanLevel] = useState(0);
  const tanLevelRef = useRef(0);
  const [tanExpiresAt, setTanExpiresAt] = useState<string | null>(null);
  const solarieEnteredRef = useRef<number | null>(null);
  const solarieMinutesRef = useRef(0); // accumulated minutes from previous sessions
  const [solarieTick, setSolarieTick] = useState(0); // increments each second in solarie
  const lastMsgTimesRef = useRef<number[]>([]);
  const cooldownEndRef = useRef(0);
  const [cooldownSec, setCooldownSec] = useState(0);
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
  const [adminTab, setAdminTab] = useState<"users" | "items" | "bots" | "self">("users");
  const [isInvisible, setIsInvisible] = useState(false);
  const isInvisibleRef = useRef(false);
  const [nameColor, setNameColor] = useState<string | null>(null);
  const [auraColor, setAuraColor] = useState<string | null>(null);
  const [bubbleColor, setBubbleColor] = useState<string | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminSearchResults, setAdminSearchResults] = useState<Profile[]>([]);
  const [adminEditTarget, setAdminEditTarget] = useState<Profile | null>(null);
  const [adminEditForm, setAdminEditForm] = useState<{ xp: string; coins: string; total_online_seconds: string; tan_level: string; muted_until: string; name_color: string | null; aura_color: string | null; bubble_color: string | null }>({ xp: "", coins: "", total_online_seconds: "", tan_level: "", muted_until: "", name_color: null, aura_color: null, bubble_color: null });
  const [adminMoveTarget, setAdminMoveTarget] = useState<{ user_id: string; display_name: string } | null>(null);
  const [adminMoveTile, setAdminMoveTile] = useState<{ gx: string; gy: string }>({ gx: "", gy: "" });
  const [adminMoveRoom, setAdminMoveRoom] = useState<string>("");
  const [createBotForm, setCreateBotForm] = useState<{ name: string; color: string; message: string; moves_randomly: boolean; gives_clothing_id: string } | null>(null);
  const [movingBotId, setMovingBotId] = useState<string | null>(null);
  const [coins, setCoins] = useState(1000);
  const [activeRoomType, setActiveRoomType] = useState(initialRoomType ?? "normal");
  const [activeRoomOwnerId, setActiveRoomOwnerId] = useState<string | null>(initialRoomOwnerId ?? null);
  // ─── Roulette state ─────────────────────────────────────────────────────────
  const [rouletteRound, setRouletteRound] = useState<RouletteRound | null>(null);
  const rouletteRoundRef = useRef<RouletteRound | null>(null);
  const [rouletteBets, setRouletteBets] = useState<RouletteBet[]>([]);
  const [rouletteHistory, setRouletteHistory] = useState<{ id: number; result: number }[]>([]);
  const [rouletteBetAmount, setRouletteBetAmount] = useState(10);
  const [rouletteBetType, setRouletteBetType] = useState("red");
  const [rouletteBetValue, setRouletteBetValue] = useState("red");
  const [rouletteTimeLeft, setRouletteTimeLeft] = useState(15);
  const [rouletteWheelAngle, setRouletteWheelAngle] = useState(0);
  const [roulettePhase, setRoulettePhase] = useState<"betting" | "spinning" | "finished">("betting");
  const [rouletteLastWin, setRouletteLastWin] = useState<number | null>(null);
  const rouletteProcessedRef = useRef<Set<number>>(new Set());
  const roulettePlacedRef = useRef<Set<number>>(new Set()); // rounds where we already placed bets
  const [rouletteTab, setRouletteTab] = useState<"bet" | "history">("bet");
  const [rouletteMyHistory, setRouletteMyHistory] = useState<RouletteBet[]>([]);
  const [rouletteGx, setRouletteGx] = useState<number | null>(null);
  const [rouletteGy, setRouletteGy] = useState<number | null>(null);
  const [rouletteScale, setRouletteScale] = useState(1.0);
  const [rouletteMoveMode, setRouletteMoveMode] = useState(false);
  const [portals, setPortals] = useState<RoomPortal[]>([]);
  const [portalFormType, setPortalFormType] = useState<"door" | "window">("door");
  const [portalFormSize, setPortalFormSize] = useState<1 | 2 | 3>(1);
  const [portalFormTargetRoomId, setPortalFormTargetRoomId] = useState<string>("");
  const [rouletteSelectedNums, setRouletteSelectedNums] = useState<Set<number>>(new Set());
  const [rouletteNumberGridOpen, setRouletteNumberGridOpen] = useState(false);
  const rouletteLastBetRef = useRef<{ type: string; value: string; nums: number[]; amount: number } | null>(null);
  // ─── Dart state ──────────────────────────────────────────────────────────────
  const [dartGames, setDartGames] = useState<DartGame[]>([]);
  const [dartThrows, setDartThrows] = useState<DartThrow[]>([]);
  const [dartStartModal, setDartStartModal] = useState<{ itemId: string } | null>(null);
  const [dartStartGameType, setDartStartGameType] = useState<201 | 301 | 501>(501);
  const [dartStartOpponentId, setDartStartOpponentId] = useState<string>("");
  const [dartInviteModal, setDartInviteModal] = useState<{ game: DartGame } | null>(null);
  const [dartHistoryModal, setDartHistoryModal] = useState<{ gameId: string } | null>(null);
  const [dartThrowEffects, setDartThrowEffects] = useState<Map<string, string>>(new Map());
  const [dartAnimating, setDartAnimating] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const xpRef = useRef(0);
  const [wardrobeActiveSlot, setWardrobeActiveSlot] = useState<string | null>(null);
  const [wardrobePreviewId, setWardrobePreviewId] = useState<string | null>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [lockedTiles, setLockedTiles] = useState<Set<string>>(new Set());
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [myAchievements, setMyAchievements] = useState<Set<string>>(new Set());
  const messageCountRef = useRef(0);
  const [messageCountState, setMessageCountState] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);
  const [achievementNotif, setAchievementNotif] = useState<Achievement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // ─── DM state ───────────────────────────────────────────────────────────
  const [dmConversations, setDmConversations] = useState<DmConversation[]>([]);
  const [activeDmConvId, setActiveDmConvId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<DmMessage[]>([]);
  const [dmDraft, setDmDraft] = useState("");
  const [dmUnread, setDmUnread] = useState(0);
  const [dmEmojiOpen, setDmEmojiOpen] = useState(false);
  const [dmPartnerOutfit, setDmPartnerOutfit] = useState<Record<string, string>>({});
  const activeDmConvIdRef = useRef<string | null>(null);
  const dmEndRef = useRef<HTMLDivElement | null>(null);
  const [botMsgTick, setBotMsgTick] = useState(0);
  const [passcodePrompt, setPasscodePrompt] = useState<{ room: ChatRoom } | null>(null);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [disconnected, setDisconnected] = useState(false);
  const [disconnectMsg, setDisconnectMsg] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(120);
  // If DB says confirm_pending=true from a previous session, the profile load effect will move this
  // back by (3600s - 1-3min) so the modal fires again soon.
  const lastHourConfirmRef = useRef(Date.now());
  const showConfirmModalRef = useRef(false);
  const disconnectedRef = useRef(false);
  const minuteXpAccRef = useRef(0);
  // Session start persists across refreshes via localStorage (max 4h gap)
  const _storedStart = typeof window !== "undefined" ? parseInt(localStorage.getItem("vr_session_start") ?? "0") : 0;
  const _sessionStart = _storedStart && Date.now() - _storedStart < 4 * 60 * 60 * 1000 ? _storedStart : Date.now();
  if (typeof window !== "undefined") localStorage.setItem("vr_session_start", _sessionStart.toString());
  const sessionStartRef = useRef(_sessionStart);
  const confirmedHoursRef = useRef(0);
  const [confirmedHours, setConfirmedHours] = useState(0);
  const [timeToNextHour, setTimeToNextHour] = useState(3600);
  const totalSecondsRef = useRef(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const accessTokenRef = useRef<string | null>(null);
  const [placingItem, setPlacingItem] = useState<{ item: RoomItem; rotation: number } | null>(null);
  const [movingFloorItemId, setMovingFloorItemId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const roomDivRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef<{ cx: number; cy: number; px: number; py: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { botsRef.current = bots; }, [bots]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => {
    const ids = Array.from(users.keys());
    if (ids.length === 0) { setMutedUsers(new Set()); return; }
    supabase.from("profiles").select("id, muted_until").in("id", ids).then(({ data }) => {
      if (!data) return;
      const now = new Date().toISOString();
      setMutedUsers(new Set(data.filter(p => p.muted_until && p.muted_until > now).map(p => p.id)));
    });
  }, [users]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch spaceships for users in room
  useEffect(() => {
    const ids = Array.from(users.keys());
    if (ids.length === 0) { setSpaceshipOf(new Map()); return; }
    supabase.from("chat_rooms").select("id, name, owner_id").eq("room_type", "spaceship").in("owner_id", ids).then(({ data }) => {
      if (!data) return;
      const m = new Map<string, { id: string; name: string }>();
      (data as ChatRoom[]).forEach(r => { if (r.owner_id) m.set(r.owner_id, { id: r.id, name: r.name }); });
      setSpaceshipOf(m);
    });
  }, [users]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep access token up to date for keepalive saves
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) accessTokenRef.current = session.access_token; });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { accessTokenRef.current = session?.access_token ?? null; });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch own spaceship + auto-switch to it on first load
  // If we already started in the spaceship (passed via initialRoomType), skip the auto-switch
  const autoSwitchedToSpaceshipRef = useRef(initialRoomType === "spaceship");
  useEffect(() => {
    supabase.from("chat_rooms").select("*").eq("room_type", "spaceship").eq("owner_id", currentProfile.id).maybeSingle().then(({ data }) => {
      const ship = data as ChatRoom | null;
      setMySpaceship(ship);
      if (ship && !autoSwitchedToSpaceshipRef.current) {
        autoSwitchedToSpaceshipRef.current = true;
        setActiveRoomId(ship.id);
        setActiveRoomName(ship.name);
        setRoomDimensions(ship.cols ?? DEFAULT_COLS, ship.rows ?? DEFAULT_ROWS);
        setActiveRoomType("spaceship");
        setActiveRoomOwnerId(ship.owner_id ?? null);
        setActiveThemeKey(ship.theme_key ?? "blue");
        setActiveFloorPattern(ship.floor_pattern ?? "standard");
        myPosRef.current = { gx: Math.floor(Math.random() * (ship.cols ?? DEFAULT_COLS)), gy: Math.floor(Math.random() * (ship.rows ?? DEFAULT_ROWS)) };
        setMyPos(myPosRef.current);
        setZoom(1);
        panRef.current = { x: 0, y: 0 };
        setPan({ x: 0, y: 0 });
      }
    });
  }, [currentProfile.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    confirmedHoursRef.current += 1;
    setConfirmedHours(confirmedHoursRef.current);
    const newCoins = coinsRef.current + 100;
    coinsRef.current = newCoins; setCoins(newCoins);
    const newXp = xpRef.current + 50; // 50 XP bonus for hourly confirmation
    xpRef.current = newXp; setXp(newXp);
    await supabase.from("profiles").update({ coins: newCoins, xp: newXp, confirm_pending: false, last_hour_confirm_at: new Date().toISOString() }).eq("id", currentProfile.id);
  }, [supabase, currentProfile.id]);

  // Inactivity + hourly check (every 30s)
  useEffect(() => {
    const check = setInterval(() => {
      if (disconnectedRef.current) return;
      const now = Date.now();
      if (now - lastActivityRef.current > 30 * 60 * 1000) {
        triggerDisconnect("Du er blevet afkoblet pga. inaktivitet");
        return;
      }
      if (!showConfirmModalRef.current && now - lastHourConfirmRef.current > 60 * 60 * 1000) {
        showConfirmModalRef.current = true;
        setShowConfirmModal(true);
        setConfirmCountdown(120);
      }
      // Time-based XP: +1 XP per minute (0.5 per 30s tick) — separate from level
      minuteXpAccRef.current += 0.5;
      if (minuteXpAccRef.current >= 1) {
        const add = Math.floor(minuteXpAccRef.current);
        minuteXpAccRef.current -= add;
        const newXp = xpRef.current + add;
        xpRef.current = newXp;
        setXp(newXp);
        supabase.from("profiles").update({ xp: newXp }).eq("id", currentProfile.id);
      }
      // Update time-to-next-hour countdown
      setTimeToNextHour(Math.max(0, 3600 - Math.floor((now - lastHourConfirmRef.current) / 1000)));
      // Accumulate total online seconds — level is computed from this
      const newTotal = totalSecondsRef.current + 30;
      totalSecondsRef.current = newTotal;
      setTotalSeconds(newTotal);
      const newLevel = levelFromSeconds(newTotal);
      if (newLevel > levelRef.current) {
        setShowLevelUp(newLevel);
        setTimeout(() => setShowLevelUp(null), 4000);
        levelRef.current = newLevel;
        setLevel(newLevel);
        channelRef.current?.send({ type: "broadcast", event: "level_up", payload: { user_id: currentProfile.id, level: newLevel } });
      }
      supabase.from("profiles").update({ total_online_seconds: newTotal }).eq("id", currentProfile.id);
      // Online time achievements
      if (newTotal >= 36000) checkAchievement("online_10h");   // 10h
      if (newTotal >= 360000) checkAchievement("online_100h"); // 100h
      // Level achievements from time
      if (newLevel >= 5) checkAchievement("level_5");
      if (newLevel >= 10) checkAchievement("level_10");
      if (newLevel >= 20) checkAchievement("level_20");
    }, 30_000);
    return () => clearInterval(check);
  }, [triggerDisconnect, currentProfile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Confirmation modal countdown
  useEffect(() => {
    if (!showConfirmModal) return;
    const cd = setInterval(() => {
      setConfirmCountdown(prev => {
        if (prev <= 1) {
          clearInterval(cd);
          supabase.from("profiles").update({ confirm_pending: true }).eq("id", currentProfile.id);
          triggerDisconnect("Tilstedeværelsesbekræftelse udløbet");
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

  // Track container size so bubble overlay can account for preserveAspectRatio letterboxing
  useEffect(() => {
    const el = roomDivRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stars = useMemo(() => {
    let seed = 98273;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    return Array.from({ length: 200 }, () => ({
      x: (rand() - 0.25) * svgW * 6,
      y: (rand() - 0.5) * svgH * 3.5,
      r: rand() * 1.1 + 0.25,
      op: rand() * 0.55 + 0.25,
      dur: (rand() * 3 + 1.5).toFixed(2),
      delay: (rand() * 5).toFixed(2),
    }));
  }, [svgW, svgH]);

  // Tight viewBox centered on the actual room geometry (accounts for wall height and asymmetric rooms)
  const roomViewBox = useMemo(() => {
    const pad = 14;
    const tcx = svgW / 2;
    const tcy = OFFSET_Y - TH / 2;
    const apexY = tcy - WALL_H;
    const left   = tcx - roomRows * TW / 2 - pad;
    const right  = tcx + roomCols * TW / 2 + pad;
    const top    = apexY - pad;
    const bottom = tcy + (roomCols + roomRows - 1) * TH / 2 + TH / 2 + pad;
    const rw = right - left;
    const rh = bottom - top;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const vbW = rw / zoom;
    const vbH = rh / zoom;
    return `${cx - vbW / 2 + pan.x} ${cy - vbH / 2 + pan.y} ${vbW} ${vbH}`;
  }, [roomCols, roomRows, svgW, zoom, pan.x, pan.y]);

  // Viewbox params for SVG→screen coordinate conversion (used by HTML bubble overlay)
  // Accounts for preserveAspectRatio="xMidYMid meet" letterboxing inside the container div.
  const vbParams = useMemo(() => {
    const pad = 14;
    const tcx = svgW / 2;
    const tcy = OFFSET_Y - TH / 2;
    const apexY = tcy - WALL_H;
    const left = tcx - roomRows * TW / 2 - pad;
    const right = tcx + roomCols * TW / 2 + pad;
    const top = apexY - pad;
    const bottom = tcy + (roomCols + roomRows - 1) * TH / 2 + TH / 2 + pad;
    const rw = right - left; const rh = bottom - top;
    const cx = (left + right) / 2; const cy = (top + bottom) / 2;
    const vbW = rw / zoom; const vbH = rh / zoom;
    const vbX = cx - vbW / 2 + pan.x;
    const vbY = cy - vbH / 2 + pan.y;
    // Compute actual rendered SVG area accounting for xMidYMid meet letterboxing
    const { w: cW, h: cH } = containerSize;
    const scale = Math.min(cW / vbW, cH / vbH);
    const renderW = vbW * scale;
    const renderH = vbH * scale;
    const offsetX = (cW - renderW) / 2;
    const offsetY = (cH - renderH) / 2;
    return { vbX, vbY, vbW, vbH, scale, renderW, renderH, offsetX, offsetY };
  }, [roomCols, roomRows, svgW, zoom, pan.x, pan.y, containerSize]);

  const setRoomDimensions = (cols: number, rows: number) => {
    roomColsRef.current = cols; roomRowsRef.current = rows;
    setRoomCols(cols); setRoomRows(rows);
    // Clamp spawn position to within actual room bounds
    const cur = myPosRef.current;
    const cgx = Math.max(0, Math.min(cols - 1, cur.gx));
    const cgy = Math.max(0, Math.min(rows - 1, cur.gy));
    if (cgx !== cur.gx || cgy !== cur.gy) {
      myPosRef.current = { gx: cgx, gy: cgy };
      setMyPos({ gx: cgx, gy: cgy });
    }
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

  // Keep tanLevelRef in sync + re-broadcast when tan changes
  useEffect(() => {
    tanLevelRef.current = tanLevel;
    if (channelRef.current) broadcastMove(myPosRef.current.gx, myPosRef.current.gy);
  }, [tanLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-broadcast when avatar color changes
  useEffect(() => {
    if (channelRef.current) broadcastMove(myPosRef.current.gx, myPosRef.current.gy);
  }, [myColor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load accumulated solarie minutes from DB on mount
  // (solarieMinutesRef is initially 0; will be overwritten once profiles fetch returns)

  // Solarie tanning timer — runs while in solarie room, accumulates across sessions (DB-persisted)
  useEffect(() => {
    if (activeRoomType !== "solarie") {
      solarieEnteredRef.current = null;
      if (tanExpiresAt && new Date(tanExpiresAt) < new Date()) {
        setTanLevel(0); tanLevelRef.current = 0;
        setTanExpiresAt(null);
        solarieMinutesRef.current = 0;
        supabase.from("profiles").update({ tan_level: 0, tan_expires_at: null, solarie_minutes: 0 }).eq("id", currentProfile.id);
      }
      return;
    }

    // solarieMinutesRef is loaded from DB at mount (profiles fetch below).
    // Do NOT re-read from DB here — it races with the cleanup save and can overwrite
    // the accumulated minutes with an old value before the previous save commits.

    const entered = Date.now();
    solarieEnteredRef.current = entered;

    // 1-second display tick + immediate level-up detection
    const displayTick = setInterval(() => {
      setSolarieTick(t => t + 1);
      const sessionMin = (Date.now() - entered) / 60000;
      const totalMin = solarieMinutesRef.current + sessionMin;
      const newLvl = tanLevelFromMinutes(totalMin);
      if (newLvl > tanLevelRef.current) {
        tanLevelRef.current = newLvl;
        setTanLevel(newLvl);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        setTanExpiresAt(expiresAt);
        supabase.from("profiles").update({ tan_level: newLvl, tan_expires_at: expiresAt, solarie_minutes: totalMin }).eq("id", currentProfile.id);
        if (newLvl >= 1) checkAchievement("solarie_1");
      }
    }, 1000);

    // 30-second save to DB
    const saveTick = setInterval(() => {
      const sessionMin = (Date.now() - entered) / 60000;
      const totalMin = solarieMinutesRef.current + sessionMin;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      setTanExpiresAt(expiresAt);
      supabase.from("profiles").update({ tan_level: tanLevelRef.current, tan_expires_at: expiresAt, solarie_minutes: totalMin }).eq("id", currentProfile.id);
    }, 30_000);

    return () => {
      const sessionMin = (Date.now() - entered) / 60000;
      solarieMinutesRef.current += sessionMin;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      supabase.from("profiles").update({ tan_level: tanLevelRef.current, tan_expires_at: expiresAt, solarie_minutes: solarieMinutesRef.current }).eq("id", currentProfile.id);
      clearInterval(displayTick);
      clearInterval(saveTick);
      solarieEnteredRef.current = null;
    };
  }, [activeRoomType]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeMood = (mood: string) => {
    myMoodRef.current = mood; setMyMood(mood);
    if (!isInvisibleRef.current) channelRef.current?.send({ type: "broadcast", event: "move", payload: { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: myPosRef.current.gx, gy: myPosRef.current.gy, mood, outfit: outfitRef.current, name_color: nameColor, aura_color: auraColor, bubble_color: bubbleColor, invisible: false } satisfies PresenceUser });
  };

  // ─── Data fetches ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("chat_rooms").select("id, name, cols, rows, room_type, theme_key, floor_pattern, owner_id, spaceship_passcode, roulette_gx, roulette_gy, roulette_scale").order("name").then(({ data }) => {
      if (data) {
        const list = (data as ChatRoom[]).map(r => ({ ...r, cols: r.cols ?? DEFAULT_COLS, rows: r.rows ?? DEFAULT_ROWS, room_type: r.room_type ?? "normal", theme_key: r.theme_key ?? "blue", floor_pattern: r.floor_pattern ?? "standard" }));
        setRooms(list);
        const cur = list.find(r => r.id === roomId);
        if (cur) {
          setRoomDimensions(cur.cols, cur.rows);
          setActiveRoomType(cur.room_type);
          setActiveRoomOwnerId(cur.owner_id ?? null);
          setActiveThemeKey(cur.theme_key ?? "blue");
          setActiveFloorPattern(cur.floor_pattern ?? "standard");
          if (cur.room_type === "shop") setRightPanel("shop");
          if (cur.room_type === "casino") {
            setRouletteGx(cur.roulette_gx ?? null);
            setRouletteGy(cur.roulette_gy ?? null);
            setRouletteScale(cur.roulette_scale ?? 1.0);
          }
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
    // Load achievements catalog + user's earned achievements
    supabase.from("achievements").select("*").order("sort_order").then(({ data }) => {
      if (data) setAllAchievements(data as Achievement[]);
    });
    supabase.from("user_achievements").select("achievement_id").eq("user_id", currentProfile.id).then(({ data }) => {
      if (data) setMyAchievements(new Set(data.map((a: { achievement_id: string }) => a.achievement_id)));
    });
    supabase.from("profiles").select("coins, last_coin_award, xp, level, total_online_seconds, last_hour_confirm_at, muted_until, tan_level, tan_expires_at, solarie_minutes, message_count, last_login_date, login_streak, confirm_pending, name_color, aura_color, bubble_color").eq("id", currentProfile.id).single().then(({ data }) => {
      if (data) {
        if (data.xp != null) { xpRef.current = data.xp; setXp(data.xp); }
        // Load tan — reset if expired
        solarieMinutesRef.current = data.solarie_minutes ?? 0;
        if (data.tan_expires_at && new Date(data.tan_expires_at) > new Date()) {
          tanLevelRef.current = data.tan_level ?? 0;
          setTanLevel(data.tan_level ?? 0);
          setTanExpiresAt(data.tan_expires_at);
        } else if (data.tan_level > 0) {
          solarieMinutesRef.current = 0;
          supabase.from("profiles").update({ tan_level: 0, tan_expires_at: null, solarie_minutes: 0 }).eq("id", currentProfile.id);
        }
        if (data.total_online_seconds != null) {
          totalSecondsRef.current = data.total_online_seconds;
          setTotalSeconds(data.total_online_seconds);
          const lvTime = levelFromSeconds(data.total_online_seconds);
          const lvXp = levelFromXp(data.xp ?? 0);
          const lv = Math.max(lvTime, lvXp);
          levelRef.current = lv;
          setLevel(lv);
        } else if (data.level != null) {
          levelRef.current = data.level;
          setLevel(data.level);
        }
        const c = (data as { coins: number; last_coin_award: string }).coins ?? 1000;
        coinsRef.current = c; setCoins(c);
        const la = (data as { coins: number; last_coin_award: string }).last_coin_award;
        if (la) lastCoinAwardRef.current = new Date(la);
        // Load own mute status
        const mu = (data as { muted_until?: string | null }).muted_until;
        if (mu && new Date(mu) > new Date()) { setMyMutedUntil(mu); myMutedUntilRef.current = mu; }
        const nc = (data as { name_color?: string | null }).name_color;
        if (nc) setNameColor(nc);
        const ac = (data as { aura_color?: string | null }).aura_color;
        if (ac) setAuraColor(ac);
        const bc = (data as { bubble_color?: string | null }).bubble_color;
        if (bc) setBubbleColor(bc);
        // Load message count
        const mc = (data as { message_count?: number }).message_count ?? 0;
        messageCountRef.current = mc;
        setMessageCountState(mc);
        // Daily login streak
        const today = new Date().toISOString().slice(0, 10);
        const lastLogin = (data as { last_login_date?: string | null }).last_login_date;
        const streak = (data as { login_streak?: number }).login_streak ?? 0;
        let newStreak = streak;
        if (lastLogin !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          newStreak = lastLogin === yesterday ? streak + 1 : 1;
          supabase.from("profiles").update({ last_login_date: today, login_streak: newStreak }).eq("id", currentProfile.id);
        }
        setLoginStreak(newStreak);
        // Restore hourly bonus countdown — position within current hour based on total online time
        const lhca = (data as { last_hour_confirm_at?: string | null }).last_hour_confirm_at;
        if (lhca) {
          lastHourConfirmRef.current = new Date(lhca).getTime();
        } else if (data.total_online_seconds > 0) {
          const secondsIntoHour = data.total_online_seconds % 3600;
          lastHourConfirmRef.current = Date.now() - secondsIntoHour * 1000;
        }
        // Pending hourly confirmation — move lastHourConfirmRef so modal shows in 1-3 min
        if ((data as { confirm_pending?: boolean }).confirm_pending) {
          const delay = (60 + Math.random() * 120) * 1000;
          lastHourConfirmRef.current = Date.now() - 3_600_000 + delay;
        }
        // Update countdown UI immediately — don't wait for the 30s interval
        setTimeToNextHour(Math.max(0, 3600 - Math.floor((Date.now() - lastHourConfirmRef.current) / 1000)));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save total_online_seconds on page unload using keepalive fetch (guaranteed to complete)
  useEffect(() => {
    const save = () => {
      if (totalSecondsRef.current <= 0 || !accessTokenRef.current) return;
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${currentProfile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${accessTokenRef.current}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ total_online_seconds: totalSecondsRef.current }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    return () => {
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
    };
  }, [currentProfile.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    globalCh
      .on("presence", { event: "sync" }, () => {
        const state = globalCh.presenceState<GlobalUser>();
        const all = new Map<string, GlobalUser>();
        for (const arr of Object.values(state)) { const p = arr[0] as GlobalUser; if (p?.user_id) all.set(p.user_id, p); }
        setGlobalUsers(all);
      })
      .on("broadcast", { event: "user_muted" }, ({ payload }) => {
        const p = payload as { user_id: string; muted_until: string | null };
        // Update the room muted set for everyone
        setMutedUsers(prev => {
          const s = new Set(prev);
          if (p.muted_until && p.muted_until > new Date().toISOString()) s.add(p.user_id);
          else s.delete(p.user_id);
          return s;
        });
        // If I am the muted user, update my own mute state immediately
        if (p.user_id === currentProfile.id) {
          const mu = p.muted_until && new Date(p.muted_until) > new Date() ? p.muted_until : null;
          setMyMutedUntil(mu);
          myMutedUntilRef.current = mu;
        }
      })
      .on("broadcast", { event: "user_style" }, ({ payload }) => {
        const p = payload as { user_id: string; name_color: string | null; aura_color: string | null; bubble_color: string | null };
        if (p.user_id === currentProfile.id) {
          setNameColor(p.name_color);
          setAuraColor(p.aura_color);
          setBubbleColor(p.bubble_color);
        }
        setUsers(prev => {
          const m = new Map(prev);
          const u = m.get(p.user_id);
          if (u) m.set(p.user_id, { ...u, name_color: p.name_color, aura_color: p.aura_color, bubble_color: p.bubble_color });
          return m;
        });
      })
      .on("broadcast", { event: "trade_request" }, ({ payload }) => {
        const p = payload as TradeRequest & { to_id: string };
        if (p.to_id !== currentProfile.id) return;
        setTradeRequest({ from_id: p.from_id, from_name: p.from_name, from_color: p.from_color, trade_id: p.trade_id });
      })
      .on("broadcast", { event: "trade_response" }, ({ payload }) => {
        const p = payload as { to_id: string; trade_id: string; accepted: boolean };
        if (p.to_id !== currentProfile.id) return;
        setTradePendingPartner(null);
        if (!p.accepted) { setTradeSession(null); tradeSessionRef.current = null; return; }
        // Partner accepted — fetch their wardrobe and inventory, then open trade box
        (async () => {
          const sess = tradeSessionRef.current;
          if (!sess || sess.trade_id !== p.trade_id) return;
          const [{ data: wData }, { data: iData }] = await Promise.all([
            supabase.from("player_wardrobe").select("id, clothing_id").eq("profile_id", sess.partner_id),
            supabase.from("virtual_room_items").select("id, name, item_type").eq("owner_id", sess.partner_id).is("room_id", null).limit(50),
          ]);
          setPartnerWardrobe(wData ?? []);
          setPartnerInventory(iData ?? []);
          setTradeSession(sess);
        })();
      })
      .on("broadcast", { event: "trade_offer_update" }, ({ payload }) => {
        const p = payload as { to_id: string; trade_id: string; offer: TradeOffer };
        if (p.to_id !== currentProfile.id) return;
        setTradeSession(prev => {
          if (!prev || prev.trade_id !== p.trade_id) return prev;
          const next = { ...prev, their_offer: p.offer };
          tradeSessionRef.current = next;
          return next;
        });
      })
      .on("broadcast", { event: "trade_confirm" }, ({ payload }) => {
        const p = payload as { to_id: string; trade_id: string };
        if (p.to_id !== currentProfile.id) return;
        setTradeSession(prev => {
          if (!prev || prev.trade_id !== p.trade_id) return prev;
          const next = { ...prev, their_confirmed: true };
          tradeSessionRef.current = next;
          return next;
        });
      })
      .on("broadcast", { event: "trade_cancel" }, ({ payload }) => {
        const p = payload as { to_id: string; trade_id: string };
        if (p.to_id !== currentProfile.id) return;
        setTradeSession(null); tradeSessionRef.current = null;
        setTradeRequest(null); setTradePendingPartner(null);
      })
      .subscribe(() => {
        roomJoinedAtRef.current = Date.now();
        globalCh.track({ user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, room_id: activeRoomId, room_name: activeRoomName, outfit: outfitRef.current, is_admin: currentProfile.role === "admin", room_joined_at: roomJoinedAtRef.current, last_activity: lastActivityRef.current });
      });
    return () => { supabase.removeChannel(globalCh); globalChannelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    roomJoinedAtRef.current = Date.now();
    globalChannelRef.current?.track({ user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, room_id: activeRoomId, room_name: activeRoomName, outfit: outfitRef.current, is_admin: currentProfile.role === "admin", room_joined_at: roomJoinedAtRef.current, last_activity: lastActivityRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId, activeRoomName]);

  // ─── DM: load conversations + realtime new-message subscription ───────────
  useEffect(() => {
    const loadConvs = async () => {
      const { data: convs } = await supabase
        .from("private_conversations")
        .select("id, user1_id, user2_id, last_message_at")
        .or(`user1_id.eq.${currentProfile.id},user2_id.eq.${currentProfile.id}`)
        .order("last_message_at", { ascending: false });
      if (!convs) return;
      const partnerIds = convs.map(c => c.user1_id === currentProfile.id ? c.user2_id : c.user1_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_color").in("id", partnerIds);
      const profileMap = new Map((profiles ?? []).map((p: { id: string; display_name: string; avatar_color: string }) => [p.id, p]));
      // Load last message + unread count for each conversation
      const convList: DmConversation[] = await Promise.all(convs.map(async c => {
        const partnerId = c.user1_id === currentProfile.id ? c.user2_id : c.user1_id;
        const partner = profileMap.get(partnerId) ?? { display_name: "?", avatar_color: "#8b5cf6" };
        const { data: msgs } = await supabase.from("private_messages")
          .select("id, content, sender_id, read_at")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);
        const { count: unread } = await supabase.from("private_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_id", currentProfile.id)
          .is("read_at", null);
        return {
          id: c.id,
          partner_id: partnerId,
          partner_name: partner.display_name,
          partner_color: partner.avatar_color,
          last_message_at: c.last_message_at,
          unread_count: unread ?? 0,
          last_preview: msgs?.[0]?.content?.slice(0, 60) ?? "",
        };
      }));
      setDmConversations(convList);
      setDmUnread(convList.reduce((s, c) => s + c.unread_count, 0));
    };
    loadConvs();
    // Realtime: new private messages → update conversations list + unread
    const dmCh = supabase.channel("dm-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages" }, async (payload) => {
        const msg = payload.new as { id: string; conversation_id: string; sender_id: string; content: string; created_at: string };
        if (msg.sender_id === currentProfile.id) return;
        // Play DM notification sound (only for incoming private messages)
        try {
          if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
          const ac = audioCtxRef.current;
          ac.resume().then(() => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain); gain.connect(ac.destination);
            osc.type = "sine"; osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.12, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
            osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.5);
          }).catch(() => {});
        } catch { /* ignore */ }
        // Mark as delivered
        await supabase.from("private_messages").update({ delivered_at: new Date().toISOString() }).eq("id", msg.id);
        // If currently viewing this conversation → mark as read too + append message
        if (activeDmConvIdRef.current === msg.conversation_id) {
          await supabase.from("private_messages").update({ read_at: new Date().toISOString() }).eq("id", msg.id);
          setDmMessages(prev => [...prev, { id: msg.id, sender_id: msg.sender_id, content: msg.content, created_at: msg.created_at, delivered_at: new Date().toISOString(), read_at: new Date().toISOString() }]);
          setTimeout(() => dmEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        } else {
          setDmUnread(n => n + 1);
          setDmConversations(prev => prev.map(c => c.id === msg.conversation_id
            ? { ...c, unread_count: c.unread_count + 1, last_preview: msg.content.slice(0, 60), last_message_at: msg.created_at }
            : c).sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "private_messages" }, (payload) => {
        // Update read receipts on sender's side (delivered_at / read_at changes)
        const updated = payload.new as DmMessage;
        setDmMessages(prev => prev.map(m => m.id === updated.id ? { ...m, delivered_at: updated.delivered_at, read_at: updated.read_at } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(dmCh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── DM helpers ─────────────────────────────────────────────────────────
  const openDmConversation = async (convId: string) => {
    activeDmConvIdRef.current = convId;
    setActiveDmConvId(convId);
    setRightPanel("dm_chat");
    // Load messages + partner outfit in parallel
    const conv = dmConversations.find(c => c.id === convId);
    const [messagesResult, wardrobeResult] = await Promise.all([
      supabase.from("private_messages")
        .select("id, sender_id, content, created_at, delivered_at, read_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(100),
      conv?.partner_id
        ? supabase.from("virtual_user_wardrobe")
            .select("clothing_id")
            .eq("user_id", conv.partner_id)
            .eq("equipped", true)
        : Promise.resolve({ data: [] }),
    ]);
    setDmMessages((messagesResult.data ?? []) as DmMessage[]);
    // Build partner outfit map: { slot: clothing_id }
    if (wardrobeResult.data && wardrobeResult.data.length > 0) {
      const outfitMap: Record<string, string> = {};
      for (const w of wardrobeResult.data as { clothing_id: string }[]) {
        const item = clothingCatalog.find(c => c.id === w.clothing_id);
        if (item) outfitMap[item.slot] = w.clothing_id;
      }
      setDmPartnerOutfit(outfitMap);
    } else {
      setDmPartnerOutfit({});
    }
    setTimeout(() => dmEndRef.current?.scrollIntoView({ behavior: "instant" }), 50);
    // Mark all unread as read
    await supabase.from("private_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", convId)
      .neq("sender_id", currentProfile.id)
      .is("read_at", null);
    setDmConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
    setDmUnread(prev => Math.max(0, prev - (dmConversations.find(c => c.id === convId)?.unread_count ?? 0)));
  };

  const startDmWith = async (partnerId: string, partnerName: string, partnerColor: string) => {
    setCtxMenu(null);
    // Find or create conversation (canonical: smaller uuid is user1)
    const [u1, u2] = [currentProfile.id, partnerId].sort();
    const { data: existing } = await supabase.from("private_conversations")
      .select("id").eq("user1_id", u1).eq("user2_id", u2).single();
    let convId = existing?.id;
    if (!convId) {
      const { data: created } = await supabase.from("private_conversations")
        .insert({ user1_id: u1, user2_id: u2 }).select("id").single();
      convId = created?.id;
    }
    if (!convId) return;
    // Ensure conversation is in local list
    setDmConversations(prev => {
      if (prev.some(c => c.id === convId)) return prev;
      return [{ id: convId!, partner_id: partnerId, partner_name: partnerName, partner_color: partnerColor, last_message_at: new Date().toISOString(), unread_count: 0, last_preview: "" }, ...prev];
    });
    openDmConversation(convId);
  };

  const sendDmMessage = async () => {
    const text = dmDraft.trim();
    if (!text || !activeDmConvId) return;
    if (myMutedUntil && new Date(myMutedUntil) > new Date()) return;
    setDmDraft("");
    setDmEmojiOpen(false);
    const { data } = await supabase.from("private_messages")
      .insert({ conversation_id: activeDmConvId, sender_id: currentProfile.id, content: text })
      .select("id, sender_id, content, created_at, delivered_at, read_at").single();
    if (data) {
      setDmMessages(prev => [...prev, data as DmMessage]);
      setTimeout(() => dmEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    await supabase.from("private_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", activeDmConvId);
    setDmConversations(prev => prev.map(c => c.id === activeDmConvId ? { ...c, last_preview: text.slice(0, 60), last_message_at: new Date().toISOString() } : c).sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)));
  };

  // Load locked tiles from DB whenever room changes + relocate if spawned on one
  useEffect(() => {
    supabase.from("chat_rooms").select("locked_tiles").eq("id", activeRoomId).single().then(({ data }) => {
      const newSet: Set<string> = new Set(data?.locked_tiles as string[] ?? []);
      setLockedTiles(newSet);
      // Non-admins must not stand on locked tiles after reload/room switch
      if (!isAdmin && newSet.size > 0) {
        const posKey = `${myPosRef.current.gx},${myPosRef.current.gy}`;
        if (newSet.has(posKey)) {
          const cols = roomColsRef.current; const rows = roomRowsRef.current;
          outer: for (let gx = 0; gx < cols; gx++) {
            for (let gy = 0; gy < rows; gy++) {
              if (!newSet.has(`${gx},${gy}`)) {
                moveMyPos(gx, gy);
                if (channelRef.current) broadcastMove(gx, gy);
                break outer;
              }
            }
          }
        }
      }
    });
  }, [activeRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Items realtime — fetch room items + any items the user is carrying (owner_id = me, any room)
  useEffect(() => {
    Promise.all([
      supabase.from("virtual_room_items").select("*").eq("room_id", activeRoomId),
      supabase.from("virtual_room_items").select("*").eq("owner_id", currentProfile.id),
    ]).then(([{ data: roomData }, { data: myData }]) => {
      const merged = new Map<string, RoomItem>();
      (roomData ?? []).forEach(i => merged.set(i.id, i as RoomItem));
      (myData ?? []).forEach(i => merged.set(i.id, i as RoomItem));
      setItems(Array.from(merged.values()));
    });
    const itemCh = supabase.channel(`items-${activeRoomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "virtual_room_items", filter: `room_id=eq.${activeRoomId}` }, (payload) => {
        if (payload.eventType === "INSERT") setItems(prev => { const m = new Map(prev.map(i => [i.id, i])); m.set(payload.new.id, payload.new as RoomItem); return Array.from(m.values()); });
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
    // Don't broadcast position when invisible — skip both move event and presence track
    if (isInvisibleRef.current) return;
    const payload: PresenceUser = { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx, gy, mood: myMoodRef.current, outfit: outfitRef.current, tan_level: tanLevelRef.current, name_color: nameColor, aura_color: auraColor, bubble_color: bubbleColor, invisible: false };
    channelRef.current?.send({ type: "broadcast", event: "move", payload });
    // Also re-track presence so joining users always see the current position
    channelRef.current?.track(payload);
  }, [currentProfile.id, currentProfile.display_name, myColor, nameColor, auraColor, bubbleColor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Always-current ref so the presence join handler can call broadcastMove without stale closure
  const broadcastMoveRef = useRef(broadcastMove);
  useEffect(() => { broadcastMoveRef.current = broadcastMove; }, [broadcastMove]);

  // Main presence/broadcast channel
  useEffect(() => {
    setUsers(new Map()); setBubbles(new Map()); userLastActivityRef.current = new Map();
    const ch = supabase.channel(`virtual-${activeRoomId}`, { config: { presence: { key: currentProfile.id } } });
    channelRef.current = ch;
    const startPos = myPosRef.current;
    const myData: PresenceUser = { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: startPos.gx, gy: startPos.gy, mood: myMoodRef.current, outfit: outfitRef.current, tan_level: tanLevelRef.current, name_color: nameColor, aura_color: auraColor, bubble_color: bubbleColor, invisible: isInvisibleRef.current };
    ch
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState<PresenceUser>();
        const others: PresenceUser[] = [];
        for (const arr of Object.values(state)) { const p = arr[0] as PresenceUser; if (p?.user_id && p.user_id !== currentProfile.id && !p.invisible) others.push(p); }
        // Initialize activity timestamp for users we haven't seen yet (so ZZZ can appear after 10min idle)
        const now = Date.now();
        for (const p of others) { if (!userLastActivityRef.current.has(p.user_id)) userLastActivityRef.current.set(p.user_id, now); }
        setUsers(prev => {
          const next = new Map(prev);
          // Update ALL presence users (not just new ones) so position is always current
          for (const p of others) { next.set(p.user_id, p); }
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
      .on("presence", { event: "join" }, () => {
        // Re-broadcast position immediately so joining users see us without waiting for a move
        broadcastMoveRef.current(myPosRef.current.gx, myPosRef.current.gy);
      })
      .on("broadcast", { event: "move" }, ({ payload }) => {
        const p = payload as PresenceUser;
        if (!p?.user_id || p.user_id === currentProfile.id || p.invisible) return;
        userLastActivityRef.current.set(p.user_id, Date.now());
        setUsers(prev => { const m = new Map(prev); m.set(p.user_id, p); return m; });
      })
      .on("broadcast", { event: "admin_move" }, ({ payload }) => {
        const p = payload as { user_id: string; gx: number; gy: number };
        if (p.user_id !== currentProfile.id) return;
        moveMyPos(p.gx, p.gy);
        if (channelRef.current) broadcastMove(p.gx, p.gy);
      })
      .on("broadcast", { event: "admin_room_switch" }, ({ payload }) => {
        const p = payload as { user_id: string; room_id: string; room_name: string; cols: number; rows: number; room_type: string; theme_key: string; floor_pattern: string; owner_id: string | null };
        if (p.user_id !== currentProfile.id) return;
        switchRoom(p.room_id, p.room_name, p.cols, p.rows, p.room_type, p.theme_key, p.floor_pattern, p.owner_id);
      })
      .on("broadcast", { event: "kick" }, ({ payload }) => {
        const p = payload as { user_id: string; by_name?: string };
        if (p.user_id !== currentProfile.id) return;
        if (onKicked) onKicked(p.by_name ?? "en admin");
        else onClose();
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { user_id: string };
        if (!p?.user_id || p.user_id === currentProfile.id) return;
        setTypingUsers(prev => { const m = new Map(prev); m.set(p.user_id, Date.now()); return m; });
      })
      .on("broadcast", { event: "level_up" }, ({ payload }) => {
        const p = payload as { user_id: string; level: number };
        if (!p?.user_id || p.user_id === currentProfile.id) return;
        setOtherLevelUps(prev => { const m = new Map(prev); m.set(p.user_id, p.level); return m; });
        setTimeout(() => setOtherLevelUps(prev => { const m = new Map(prev); m.delete(p.user_id); return m; }), 4000);
      })
      .on("broadcast", { event: "roulette_win" }, ({ payload }) => {
        const p = payload as { user_id: string; amount: number };
        if (!p?.user_id || p.user_id === currentProfile.id) return;
        setRouletteWinEffects(prev => { const m = new Map(prev); m.set(p.user_id, p.amount); return m; });
        setTimeout(() => setRouletteWinEffects(prev => { const m = new Map(prev); m.delete(p.user_id); return m; }), 3500);
      })
      .on("broadcast", { event: "dart_throw_effect" }, ({ payload }) => {
        const p = payload as { user_id: string; label: string };
        if (!p?.user_id || p.user_id === currentProfile.id) return;
        setDartThrowEffects(prev => { const m = new Map(prev); m.set(p.user_id, p.label); return m; });
        setTimeout(() => setDartThrowEffects(prev => { const m = new Map(prev); m.delete(p.user_id); return m; }), 3200);
      })
      .on("broadcast", { event: "spaceship_request" }, ({ payload }) => {
        const p = payload as VisitRequest & { to_id: string };
        if (p.to_id !== currentProfile.id) return;
        setVisitRequest({ from_id: p.from_id, from_name: p.from_name, spaceship_room_id: p.spaceship_room_id, spaceship_room_name: p.spaceship_room_name });
      })
      .on("broadcast", { event: "spaceship_invite" }, ({ payload }) => {
        const p = payload as { to_id: string; accepted: boolean; spaceship_room_id?: string; spaceship_room_name?: string; cols?: number; rows?: number; theme_key?: string; floor_pattern?: string };
        if (p.to_id !== currentProfile.id) return;
        setAwaitingVisit(false);
        if (p.accepted && p.spaceship_room_id) {
          // Always fetch latest room data from DB so theme is always correct
          supabase.from("chat_rooms").select("*").eq("id", p.spaceship_room_id).single().then(({ data }) => {
            const r = data as ChatRoom | null;
            switchRoom(p.spaceship_room_id!, r?.name ?? p.spaceship_room_name ?? "Rumskib", r?.cols ?? p.cols, r?.rows ?? p.rows, "spaceship", r?.theme_key ?? p.theme_key, r?.floor_pattern ?? p.floor_pattern, r?.owner_id);
          });
        }
      })
      .on("broadcast", { event: "spaceship_kick" }, ({ payload }) => {
        const p = payload as { user_id: string; redirect_room_id: string; redirect_room_name: string; redirect_cols?: number; redirect_rows?: number; redirect_type?: string; redirect_theme?: string; redirect_floor?: string };
        if (p.user_id !== currentProfile.id) return;
        switchRoom(p.redirect_room_id, p.redirect_room_name, p.redirect_cols, p.redirect_rows, p.redirect_type, p.redirect_theme, p.redirect_floor);
      })
      .on("broadcast", { event: "locked_tiles_update" }, ({ payload }) => {
        const p = payload as { locked_tiles: string[] };
        setLockedTiles(new Set(p.locked_tiles ?? []));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoomId}` }, async (payload) => {
        const sid: string = payload.new.user_id; const txt: string = payload.new.content;
        // Track activity for idle detection
        if (sid === currentProfile.id) lastActivityRef.current = Date.now();
        else userLastActivityRef.current.set(sid, Date.now());
        const newBubble: SpeechBubble = { id: Date.now() + Math.random(), text: txt, ts: Date.now() };
        setBubbles(prev => { const m = new Map(prev); const existing = m.get(sid) ?? []; m.set(sid, [...existing.slice(-3), newBubble]); return m; });
        setTimeout(() => { setBubbles(prev => { const m = new Map(prev); const arr = m.get(sid); if (!arr) return prev; const f = arr.filter(b => b.id !== newBubble.id); if (f.length === 0) m.delete(sid); else m.set(sid, f); return m; }); }, 7000);
        const { data } = await supabase.from("messages").select("id, content, user_id, created_at, profiles(display_name, avatar_color)").eq("id", payload.new.id).single();
        if (data) setLogMessages(prev => [...prev.slice(-49), data as LogMessage]);
      })
      .subscribe(() => { ch.track(myData); broadcastMove(myData.gx, myData.gy); });
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId, reconnectKey]);

  // Keyboard → draft
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (myMutedUntilRef.current && new Date(myMutedUntilRef.current) > new Date()) return;
      if (e.key === "Enter") { sendDraftRef.current(); return; }
      if (e.key === "Escape") {
        if (placingItem) { setPlacingItem(null); setMovingFloorItemId(null); return; }
        if (movingBotId) { setMovingBotId(null); return; }
        draftRef.current = ""; setDraft(""); return;
      }
      if ((e.key === "r" || e.key === "R") && placingItem) { e.preventDefault(); setPlacingItem(p => p ? { ...p, rotation: (p.rotation + 1) % 2 } : null); return; }
      if (e.key === "Backspace") { e.preventDefault(); setDraft(prev => { const n = prev.slice(0, -1); draftRef.current = n; return n; }); return; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (draftRef.current.length >= 100) return;
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

  // Bot message cycling (rotate through multi-line messages every 6s)
  useEffect(() => {
    const iv = setInterval(() => setBotMsgTick(t => t + 1), 6000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const h = () => setCtxMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  // Clear room hover tooltip when switching away from rooms panel
  useEffect(() => {
    if (rightPanel !== "rooms") { setHoveredRoomId(null); setTooltipPos(null); }
  }, [rightPanel]);

  // ─── Roulette round management ──────────────────────────────────────────────
  useEffect(() => {
    if (activeRoomType !== "casino") return;
    const supabase = supabaseRef.current;

    // Fetch recent bets for current round
    const fetchBets = async (roundId: number) => {
      const { data } = await supabase
        .from("roulette_bets")
        .select("*")
        .eq("round_id", roundId)
        .eq("room_id", activeRoomId)
        .order("created_at", { ascending: true });
      if (data) setRouletteBets(data as RouletteBet[]);
    };

    // Fetch last 10 results
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("roulette_rounds")
        .select("id, result")
        .eq("room_id", activeRoomId)
        .order("id", { ascending: false })
        .limit(10);
      if (data) setRouletteHistory(data as { id: number; result: number }[]);
    };

    // Ensure a round row exists for given roundId; returns the result
    const ensureRound = async (roundId: number): Promise<number> => {
      const result = Math.floor(Math.random() * 37);
      const { data, error } = await supabase
        .from("roulette_rounds")
        .insert({ id: roundId, room_id: activeRoomId, result })
        .select("result")
        .single();
      if (error) {
        // Row already exists — fetch it
        const { data: existing } = await supabase
          .from("roulette_rounds")
          .select("result")
          .eq("id", roundId)
          .eq("room_id", activeRoomId)
          .single();
        return existing?.result ?? 0;
      }
      return data?.result ?? result;
    };

    fetchHistory();

    // Subscribe to new bets (no server-side filter — filter client-side for reliability)
    const betChannel = supabase
      .channel(`roulette-bets-${activeRoomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "roulette_bets" }, payload => {
        const bet = payload.new as RouletteBet;
        if (bet.room_id !== activeRoomId) return;
        const curRoundId = rouletteRoundRef.current?.id;
        if (curRoundId !== undefined && bet.round_id !== curRoundId) return;
        setRouletteBets(prev => {
          if (prev.some(b => b.id === bet.id)) return prev;
          return [...prev, bet];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "roulette_bets" }, payload => {
        const bet = payload.new as RouletteBet;
        if (bet.room_id !== activeRoomId) return;
        setRouletteBets(prev => prev.map(b => b.id === bet.id ? bet : b));
      })
      .subscribe();

    // Round tick
    let spinInterval: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      const now = Date.now();
      const roundId = Math.floor(now / ROULETTE_ROUND_MS);
      const msInRound = now % ROULETTE_ROUND_MS;
      // Show countdown within the betting phase (10s → 1s)
      const betTimeLeft = Math.max(0, Math.ceil((ROULETTE_BET_MS - msInRound) / 1000));
      setRouletteTimeLeft(betTimeLeft);

      if (msInRound < ROULETTE_BET_MS) {
        // Betting phase
        setRoulettePhase("betting");
        if (spinInterval) { clearInterval(spinInterval); spinInterval = null; }
        if (!rouletteRoundRef.current || rouletteRoundRef.current.id !== roundId) {
          const result = await ensureRound(roundId);
          const round = { id: roundId, room_id: activeRoomId, result };
          rouletteRoundRef.current = round;
          setRouletteRound(round);
          setRouletteBets([]);
          await fetchBets(roundId);
        }
      } else if (msInRound < ROULETTE_SPIN_END) {
        // Spinning phase (5s)
        setRoulettePhase("spinning");
        if (!spinInterval) {
          spinInterval = setInterval(() => {
            setRouletteWheelAngle(a => (a + 8) % 360);
          }, 30);
        }
      } else {
        // Finished phase — resolve bets
        setRoulettePhase("finished");
        if (spinInterval) { clearInterval(spinInterval); spinInterval = null; }
        const round = rouletteRoundRef.current;
        if (round && !rouletteProcessedRef.current.has(round.id)) {
          rouletteProcessedRef.current.add(round.id);
          // Snap ball to result
          setRouletteWheelAngle(rouletteWheelAngleForResult(round.result));
          // Resolve own bets
          const { data: myBets } = await supabase
            .from("roulette_bets")
            .select("*")
            .eq("round_id", round.id)
            .eq("room_id", activeRoomId)
            .eq("user_id", currentProfile.id)
            .eq("resolved", false);
          if (myBets && myBets.length > 0) {
            let totalWin = 0;
            for (const bet of myBets as RouletteBet[]) {
              const mult = roulettePayout(bet.bet_type, bet.bet_value, round.result);
              const payout = bet.amount * mult;
              const won = mult > 0;
              totalWin += payout;
              await supabase.from("roulette_bets").update({ won, payout, resolved: true }).eq("id", bet.id);
            }
            if (totalWin > 0) {
              const newCoins = coinsRef.current + totalWin;
              coinsRef.current = newCoins;
              setCoins(newCoins);
              setRouletteLastWin(totalWin);
              await supabase.from("profiles").update({ coins: newCoins }).eq("id", currentProfile.id);
              setTimeout(() => setRouletteLastWin(null), 3500);
              // Broadcast win effect so others can see it
              channelRef.current?.send({ type: "broadcast", event: "roulette_win", payload: { user_id: currentProfile.id, amount: totalWin } });
              setRouletteWinEffects(prev => { const m = new Map(prev); m.set(currentProfile.id, totalWin); return m; });
              setTimeout(() => setRouletteWinEffects(prev => { const m = new Map(prev); m.delete(currentProfile.id); return m; }), 3500);
            }
          }
          fetchHistory();
        }
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => {
      clearInterval(interval);
      if (spinInterval) clearInterval(spinInterval);
      supabase.removeChannel(betChannel);
    };
  }, [activeRoomType, activeRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load roulette position/scale when entering a casino room
  useEffect(() => {
    if (activeRoomType !== "casino") return;
    supabase.from("chat_rooms").select("roulette_gx, roulette_gy, roulette_scale").eq("id", activeRoomId).single().then(({ data }) => {
      if (!data) return;
      setRouletteGx(data.roulette_gx ?? null);
      setRouletteGy(data.roulette_gy ?? null);
      setRouletteScale(data.roulette_scale ?? 1.0);
    });
  }, [activeRoomId, activeRoomType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load portals + realtime subscription
  useEffect(() => {
    setPortals([]);
    supabase.from("room_portals").select("*").eq("room_id", activeRoomId).then(({ data }) => {
      if (data) setPortals(data as RoomPortal[]);
    });
    const portalCh = supabase.channel(`portals-${activeRoomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_portals", filter: `room_id=eq.${activeRoomId}` }, payload => {
        setPortals(prev => { if (prev.some(p => p.id === payload.new.id)) return prev; return [...prev, payload.new as RoomPortal]; });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "room_portals" }, payload => {
        setPortals(prev => prev.filter(p => p.id !== (payload.old as RoomPortal).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(portalCh); };
  }, [activeRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load & subscribe to dart games for this room
  useEffect(() => {
    setDartGames([]); setDartThrows([]);
    supabase.from("dart_games").select("*").eq("room_id", activeRoomId).in("status", ["pending", "active"]).then(({ data }) => {
      if (data) setDartGames(data as DartGame[]);
    });
    const dartCh = supabase.channel(`dart-${activeRoomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dart_games" }, (payload) => {
        if (payload.eventType === "DELETE") { setDartGames(prev => prev.filter(g => g.id !== (payload.old as DartGame).id)); return; }
        const g = payload.new as DartGame;
        if (g.room_id !== activeRoomId) return;
        setDartGames(prev => {
          const filtered = prev.filter(x => x.id !== g.id);
          if (g.status === "finished") return filtered;
          return [...filtered, g];
        });
        if (g.status === "pending" && g.player2_id === currentProfile.id) {
          setDartInviteModal({ game: g });
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dart_throws" }, (payload) => {
        setDartThrows(prev => [...prev, payload.new as DartThrow]);
      })
      .subscribe();
    return () => { supabase.removeChannel(dartCh); };
  }, [activeRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTileClick = (gx: number, gy: number) => {
    if (isDraggingRef.current) return;
    setCtxMenu(null);
    // Roulette move mode (admin)
    if (rouletteMoveMode && isAdmin) {
      supabase.from("chat_rooms").update({ roulette_gx: gx, roulette_gy: gy }).eq("id", activeRoomId).then(() => {});
      setRouletteGx(gx); setRouletteGy(gy);
      setRouletteMoveMode(false);
      return;
    }
    if (movingBotId) {
      supabase.from("virtual_room_bots").update({ gx, gy }).eq("id", movingBotId);
      setMovingBotId(null);
      return;
    }
    if (placingItem && !isWallItemType(placingItem.item.item_type)) {
      placeFloorItem(gx, gy, placingItem.rotation);
      return;
    }
    if (Array.from(users.values()).some(u => u.user_id !== currentProfile.id && u.gx === gx && u.gy === gy)) return;
    if (bots.some(b => b.gx === gx && b.gy === gy)) return;
    if (!isAdmin && lockedTiles.has(`${gx},${gy}`)) return;
    // Block roulette area tiles in casino room
    if (activeRoomType === "casino") {
      const rgx = rouletteGx ?? Math.floor(roomCols / 2);
      const rgy = rouletteGy ?? Math.floor(roomRows / 2);
      if (Math.abs(gx - rgx) <= 1 && Math.abs(gy - rgy) <= 1) return;
    }
    moveMyPos(gx, gy); broadcastMove(gx, gy);
  };

  const handleRightClick = (e: React.MouseEvent, user: PresenceUser | null, item: RoomItem | null, bot: RoomBot | null, tileGx?: number, tileGy?: number) => {
    e.preventDefault(); e.stopPropagation();
    if (user?.user_id === currentProfile.id) { setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "self" }); return; }
    if (user) { setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "user", user }); return; }
    if (bot) { setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "bot", bot }); return; }
    if (item) {
      if (item.item_type === "dartboard") { setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "dartboard", item }); return; }
      setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "tile_item", item }); return;
    }
    if (isAdmin && tileGx !== undefined && tileGy !== undefined) {
      setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "tile", tileGx, tileGy });
    }
  };

  const handleDartThrow = async (game: DartGame) => {
    if (dartAnimating) return;
    if (game.current_player_id !== currentProfile.id) return;
    if (game.status !== "active") return;
    setDartAnimating(true);
    const isP1 = game.player1_id === currentProfile.id;
    const scoreBefore = isP1 ? game.player1_score : game.player2_score;
    const { segment, multiplier, points } = simulateDartThrow(scoreBefore);
    const rawNew = scoreBefore - points;
    const isBust = rawNew < 0 || rawNew === 1 || (rawNew === 0 && !(multiplier === 2 || segment === 50));
    const scoreAfter = isBust ? scoreBefore : rawNew;
    const isWin = !isBust && rawNew === 0;
    const throwNum = game.throws_this_turn + 1;
    const turnDone = isBust || isWin || throwNum >= 3;
    // Build effect label
    const baseLabel = segment === 50 ? "BULLSEYE! 50" :
      segment === 25 ? "Bull 25" :
      segment === 0 ? "Miss!" :
      multiplier === 3 ? `Triple ${segment} (${points})` :
      multiplier === 2 ? `Double ${segment} (${points})` :
      `${segment} (${points})`;
    const label = isBust ? `BUST – ${baseLabel}` : isWin ? `FINISH! ${baseLabel} 🏆` : baseLabel;
    // Show effect on own avatar
    setDartThrowEffects(prev => { const m = new Map(prev); m.set(currentProfile.id, label); return m; });
    setTimeout(() => setDartThrowEffects(prev => { const m = new Map(prev); m.delete(currentProfile.id); return m; }), 3200);
    // Broadcast to others
    channelRef.current?.send({ type: "broadcast", event: "dart_throw_effect", payload: { user_id: currentProfile.id, label } });
    // Insert throw record
    supabase.from("dart_throws").insert({
      game_id: game.id, player_id: currentProfile.id,
      throw_number: throwNum, segment, multiplier, points,
      score_before: scoreBefore, score_after: scoreAfter, is_bust: isBust,
    }).then(() => {});
    // Update game state
    const updates: Record<string, unknown> = {
      ...(isP1 ? { player1_score: scoreAfter } : { player2_score: scoreAfter }),
      throws_this_turn: turnDone ? 0 : throwNum,
      ...(turnDone ? { current_player_id: isP1 ? game.player2_id : game.player1_id } : {}),
      ...(isWin ? { status: "finished", winner_id: currentProfile.id } : {}),
    };
    supabase.from("dart_games").update(updates).eq("id", game.id).then(() => {});
    setTimeout(() => setDartAnimating(false), 900);
  };

  const openProfile = async (userId: string) => {
    setCtxMenu(null);
    if (userId === currentProfile.id) { setRightPanel("profile"); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfileView(data as Profile); setRightPanel("userprofile");
      supabase.from("user_achievements").select("achievement_id").eq("user_id", userId).then(({ data: ach }) => {
        setProfileViewAchievements(new Set((ach ?? []).map((a: { achievement_id: string }) => a.achievement_id)));
      });
    }
  };

  const kickUser = (user: PresenceUser) => {
    setCtxMenu(null);
    channelRef.current?.send({ type: "broadcast", event: "kick", payload: { user_id: user.user_id, by_name: currentProfile.display_name } });
  };

  const kickFromSpaceship = (user: PresenceUser) => {
    setCtxMenu(null);
    const normalRoom = rooms.find(r => r.room_type === "normal");
    if (!normalRoom) return;
    channelRef.current?.send({ type: "broadcast", event: "spaceship_kick", payload: { user_id: user.user_id, redirect_room_id: normalRoom.id, redirect_room_name: normalRoom.name, redirect_cols: normalRoom.cols, redirect_rows: normalRoom.rows, redirect_type: normalRoom.room_type, redirect_theme: normalRoom.theme_key, redirect_floor: normalRoom.floor_pattern } });
  };

  const startTrade = (user: PresenceUser) => {
    setCtxMenu(null);
    // Close any existing trade/pending state first
    setTradeSession(null);
    tradeSessionRef.current = null;
    setTradePendingPartner(null);
    const trade_id = `${currentProfile.id}-${Date.now()}`;
    // Store session ref so trade_response can match it — but do NOT set tradeSession state (that opens the box)
    tradeSessionRef.current = {
      trade_id,
      partner_id: user.user_id, partner_name: user.display_name, partner_color: user.color,
      my_offer: { coins: 0, clothing_ids: [], item_ids: [] },
      their_offer: { coins: 0, clothing_ids: [], item_ids: [] },
      my_confirmed: false, their_confirmed: false,
    };
    // Show "waiting for response" banner — trade box stays closed until partner accepts
    setTradePendingPartner({ partner_id: user.user_id, partner_name: user.display_name, partner_color: user.color, trade_id });
    setTimeout(() => setTradePendingPartner(prev => prev?.trade_id === trade_id ? null : prev), 30000);
    globalChannelRef.current?.send({ type: "broadcast", event: "trade_request", payload: { to_id: user.user_id, from_id: currentProfile.id, from_name: currentProfile.display_name, from_color: myColor, trade_id } });
  };

  const respondTrade = async (accepted: boolean) => {
    const req = tradeRequest;
    if (!req) return;
    setTradeRequest(null);
    globalChannelRef.current?.send({ type: "broadcast", event: "trade_response", payload: { to_id: req.from_id, trade_id: req.trade_id, accepted } });
    if (!accepted) return;
    // Open trade session as acceptor
    const [{ data: wData }, { data: iData }] = await Promise.all([
      supabase.from("player_wardrobe").select("id, clothing_id").eq("profile_id", req.from_id),
      supabase.from("virtual_room_items").select("id, name, item_type").eq("owner_id", req.from_id).is("room_id", null).limit(50),
    ]);
    setPartnerWardrobe(wData ?? []);
    setPartnerInventory(iData ?? []);
    const sess: TradeSession = {
      trade_id: req.trade_id,
      partner_id: req.from_id, partner_name: req.from_name, partner_color: req.from_color,
      my_offer: { coins: 0, clothing_ids: [], item_ids: [] },
      their_offer: { coins: 0, clothing_ids: [], item_ids: [] },
      my_confirmed: false, their_confirmed: false,
    };
    setTradeSession(sess);
    tradeSessionRef.current = sess;
  };

  const updateMyOffer = (offer: TradeOffer) => {
    setTradeSession(prev => {
      if (!prev) return prev;
      const next = { ...prev, my_offer: offer, my_confirmed: false };
      tradeSessionRef.current = next;
      // broadcast to partner
      globalChannelRef.current?.send({ type: "broadcast", event: "trade_offer_update", payload: { to_id: prev.partner_id, trade_id: prev.trade_id, offer } });
      return next;
    });
  };

  const confirmTrade = async () => {
    setTradeSession(prev => {
      if (!prev) return prev;
      const next = { ...prev, my_confirmed: true };
      tradeSessionRef.current = next;
      globalChannelRef.current?.send({ type: "broadcast", event: "trade_confirm", payload: { to_id: prev.partner_id, trade_id: prev.trade_id } });
      return next;
    });
  };

  const cancelTrade = () => {
    const sess = tradeSessionRef.current;
    if (sess) globalChannelRef.current?.send({ type: "broadcast", event: "trade_cancel", payload: { to_id: sess.partner_id, trade_id: sess.trade_id } });
    setTradeSession(null); tradeSessionRef.current = null;
    setTradeRequest(null);
  };

  const executeTrade = async () => {
    const sess = tradeSessionRef.current;
    if (!sess || !sess.my_confirmed || !sess.their_confirmed) return;
    const { my_offer, their_offer, partner_id } = sess;
    // Coins
    if (my_offer.coins > 0 || their_offer.coins > 0) {
      const myNew = coinsRef.current - my_offer.coins + their_offer.coins;
      await supabase.from("profiles").update({ coins: myNew }).eq("id", currentProfile.id);
      coinsRef.current = myNew; setCoins(myNew);
    }
    // Clothing I give away
    for (const cid of my_offer.clothing_ids) {
      await supabase.from("player_wardrobe").update({ profile_id: partner_id, equipped: false }).eq("clothing_id", cid).eq("profile_id", currentProfile.id);
    }
    // Clothing I receive
    for (const cid of their_offer.clothing_ids) {
      const existing = await supabase.from("player_wardrobe").select("id").eq("clothing_id", cid).eq("profile_id", currentProfile.id).maybeSingle();
      if (!existing.data) {
        await supabase.from("player_wardrobe").update({ profile_id: currentProfile.id, equipped: false }).eq("clothing_id", cid).eq("profile_id", partner_id);
      }
    }
    // Items I give away
    for (const iid of my_offer.item_ids) {
      await supabase.from("virtual_room_items").update({ owner_id: partner_id }).eq("id", iid);
    }
    // Refresh wardrobe
    const { data: wNew } = await supabase.from("player_wardrobe").select("id, clothing_id, equipped").eq("profile_id", currentProfile.id);
    if (wNew) setMyWardrobe(wNew as UserWardrobeEntry[]);
    // Refresh items (myInventory is derived from items)
    const { data: iNew } = await supabase.from("virtual_room_items").select("*").eq("owner_id", currentProfile.id).is("room_id", null);
    if (iNew) setItems(prev => {
      const m = new Map(prev.map(i => [i.id, i]));
      (iNew as RoomItem[]).forEach(i => m.set(i.id, i));
      return Array.from(m.values());
    });
    setTradeSession(null); tradeSessionRef.current = null;
  };

  useEffect(() => {
    if (tradeSession?.my_confirmed && tradeSession?.their_confirmed) {
      executeTrade();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeSession?.my_confirmed, tradeSession?.their_confirmed]);

  const switchRoom = (id: string, name: string, cols?: number, rows?: number, roomType?: string, themeKey?: string, floorPattern?: string, ownerId?: string | null) => {
    const nc = cols ?? roomColsRef.current; const nr = rows ?? roomRowsRef.current;
    const rt = roomType ?? "normal";
    setActiveRoomId(id); setActiveRoomName(name); setRoomDimensions(nc, nr);
    setActiveRoomType(rt); setRightPanel(rt === "shop" ? "shop" : "hidden");
    setActiveThemeKey(themeKey ?? "blue");
    setActiveFloorPattern(floorPattern ?? "standard");
    setActiveRoomOwnerId(ownerId !== undefined ? ownerId : null);
    lastActivityRef.current = Date.now();
    setZoom(1);
    panRef.current = { x: 0, y: 0 }; setPan({ x: 0, y: 0 });
    myPosRef.current = { gx: Math.floor(Math.random() * nc), gy: Math.floor(Math.random() * nr) };
    setMyPos(myPosRef.current);
    // Move all carried items (in inventory) to the new room so they follow the user
    supabase.from("virtual_room_items").update({ room_id: id }).eq("owner_id", currentProfile.id);
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
    checkAchievement("own_clothing_1");
  };

  sendDraftRef.current = async () => {
    const t = draftRef.current.trim(); if (!t) return;
    if (myMutedUntil && new Date(myMutedUntil) > new Date()) return;
    // /gå NUMMER command
    if (/^\/gå\s+\d+$/i.test(t)) {
      const num = parseInt(t.split(/\s+/)[1]);
      const normalRooms = rooms.filter(r => r.room_type !== "spaceship");
      const target = normalRooms[num - 1];
      if (target) switchRoom(target.id, target.name, target.cols, target.rows, target.room_type, target.theme_key, target.floor_pattern, target.owner_id);
      draftRef.current = ""; setDraft("");
      return;
    }
    const now = Date.now();
    if (now < cooldownEndRef.current) return;
    // Spam check: max 5 messages per 10 seconds → 5s cooldown
    lastMsgTimesRef.current = lastMsgTimesRef.current.filter(ts => now - ts < 10000);
    lastMsgTimesRef.current.push(now);
    if (lastMsgTimesRef.current.length >= 5) {
      cooldownEndRef.current = now + 5000;
      lastMsgTimesRef.current = [];
      setCooldownSec(5);
      const tick = setInterval(() => {
        const rem = Math.ceil((cooldownEndRef.current - Date.now()) / 1000);
        if (rem <= 0) { setCooldownSec(0); clearInterval(tick); } else setCooldownSec(rem);
      }, 200);
      return;
    }
    draftRef.current = ""; setDraft(""); lastActivityRef.current = Date.now();
    globalChannelRef.current?.track({ user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, room_id: activeRoomId, room_name: activeRoomName, outfit: outfitRef.current, is_admin: currentProfile.role === "admin", room_joined_at: roomJoinedAtRef.current, last_activity: lastActivityRef.current });
    await supabase.from("messages").insert({ content: t, user_id: currentProfile.id, room_id: activeRoomId });
    // Award +10 XP per message
    const newXp = xpRef.current + 10;
    const newLevel = Math.max(levelFromXp(newXp), levelFromSeconds(totalSecondsRef.current));
    if (newLevel > levelRef.current) {
      setShowLevelUp(newLevel);
      setTimeout(() => setShowLevelUp(null), 4000);
      channelRef.current?.send({ type: "broadcast", event: "level_up", payload: { user_id: currentProfile.id, level: newLevel } });
    }
    levelRef.current = newLevel;
    xpRef.current = newXp; setXp(newXp); setLevel(newLevel);
    // Track message count + achievements
    const newMsgCount = messageCountRef.current + 1;
    messageCountRef.current = newMsgCount;
    setMessageCountState(newMsgCount);
    await supabase.from("profiles").update({ xp: newXp, level: newLevel, message_count: newMsgCount }).eq("id", currentProfile.id);
    // Check message achievements
    if (newMsgCount === 1) checkAchievement("first_message");
    if (newMsgCount === 50) checkAchievement("messages_50");
    if (newMsgCount === 200) checkAchievement("messages_200");
    if (newMsgCount === 1000) checkAchievement("messages_1000");
    // Check level achievements
    if (newLevel >= 5) checkAchievement("level_5");
    if (newLevel >= 10) checkAchievement("level_10");
    if (newLevel >= 20) checkAchievement("level_20");
  };

  // ─── Item actions ──────────────────────────────────────────────────────────
  const isSpaceshipOwner = activeRoomType !== "spaceship" || activeRoomOwnerId === currentProfile.id;

  const pickupItem = async (item: RoomItem) => {
    if (!isSpaceshipOwner) return;
    setCtxMenu(null);
    await supabase.from("virtual_room_items").update({ owner_id: currentProfile.id, gx: null, gy: null, wall_side: null }).eq("id", item.id);
  };

  const placeFloorItem = async (gx: number, gy: number, rotation: number) => {
    if (!placingItem || !isSpaceshipOwner) return;
    await supabase.from("virtual_room_items").update({ owner_id: null, gx, gy, rotation, wall_side: null }).eq("id", placingItem.item.id);
    setPlacingItem(null);
    setMovingFloorItemId(null);
  };

  const placeWallItem = async (wall_side: string, wall_pos: number, wall_height: number) => {
    if (!placingItem || !isSpaceshipOwner) return;
    await supabase.from("virtual_room_items").update({ owner_id: null, gx: null, gy: null, wall_side, wall_pos, wall_height }).eq("id", placingItem.item.id);
    setPlacingItem(null);
  };

  const rotateItem = async (item: RoomItem) => {
    const next = (item.rotation + 1) % 2;
    await supabase.from("virtual_room_items").update({ rotation: next }).eq("id", item.id);
  };
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

  const checkAchievement = async (achievementId: string) => {
    if (myAchievements.has(achievementId)) return;
    const achievement = allAchievements.find(a => a.id === achievementId);
    if (!achievement) return;
    const { error } = await supabase.from("user_achievements").insert({ user_id: currentProfile.id, achievement_id: achievementId });
    if (error) return; // already earned (race condition)
    setMyAchievements(prev => { const s = new Set(prev); s.add(achievementId); return s; });
    if (achievement.reward_coins > 0 || achievement.reward_xp > 0) {
      const newCoins = coinsRef.current + achievement.reward_coins;
      const newXp = xpRef.current + achievement.reward_xp;
      const newLevel = Math.max(levelRef.current, Math.floor(newXp / 100) + 1);
      coinsRef.current = newCoins; setCoins(newCoins);
      xpRef.current = newXp; setXp(newXp);
      levelRef.current = newLevel; setLevel(newLevel);
      await supabase.from("profiles").update({ coins: newCoins, xp: newXp, level: newLevel }).eq("id", currentProfile.id);
    }
    setAchievementNotif(achievement);
    setTimeout(() => setAchievementNotif(null), 4000);
  };

  const toggleTileLock = async (gx: number, gy: number) => {
    setCtxMenu(null);
    const key = `${gx},${gy}`;
    const newSet = new Set(lockedTiles);
    if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
    setLockedTiles(newSet);
    const arr = Array.from(newSet);
    await supabase.from("chat_rooms").update({ locked_tiles: arr }).eq("id", activeRoomId);
    channelRef.current?.send({ type: "broadcast", event: "locked_tiles_update", payload: { locked_tiles: arr } });
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
    const [{ data: msgs }, { data: roomItems }, { data: myItems }, { data: roomBots }] = await Promise.all([
      supabase.from("messages").select("id, content, user_id, created_at, profiles(display_name, avatar_color)").eq("room_id", activeRoomId).eq("is_deleted", false).order("created_at", { ascending: false }).limit(50),
      supabase.from("virtual_room_items").select("*").eq("room_id", activeRoomId),
      supabase.from("virtual_room_items").select("*").eq("owner_id", currentProfile.id),
      supabase.from("virtual_room_bots").select("*").eq("room_id", activeRoomId),
    ]);
    if (msgs) setLogMessages((msgs as LogMessage[]).reverse());
    if (roomItems || myItems) {
      const merged = new Map<string, RoomItem>();
      (roomItems ?? []).forEach((i: RoomItem) => merged.set(i.id, i));
      (myItems ?? []).forEach((i: RoomItem) => merged.set(i.id, i));
      setItems(Array.from(merged.values()));
    }
    if (roomBots) setBots(roomBots as RoomBot[]);
    broadcastMove(myPosRef.current.gx, myPosRef.current.gy);
  }, [activeRoomId, broadcastMove]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    onClose();
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const verifyPasscode = useCallback(() => {
    if (!passcodePrompt) return;
    if (passcodeInput === passcodePrompt.room.spaceship_passcode) {
      const r = passcodePrompt.room;
      switchRoom(r.id, r.name, r.cols, r.rows, r.room_type, r.theme_key, r.floor_pattern, r.owner_id);
      setPasscodePrompt(null);
      setPasscodeInput("");
      setRightPanel("hidden");
    } else {
      setPasscodeError(true);
    }
  }, [passcodePrompt, passcodeInput, switchRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Derived data ──────────────────────────────────────────────────────────
  const usersByCell = useMemo(() => {
    const m = new Map<string, PresenceUser>();
    Array.from(users.values()).forEach(u => { if (u.user_id !== currentProfile.id) m.set(`${u.gx},${u.gy}`, u); });
    m.set(`${myPos.gx},${myPos.gy}`, { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: myPos.gx, gy: myPos.gy, mood: myMood, outfit: myOutfit });
    return m;
  }, [users, myPos, myMood, myOutfit, currentProfile.id, currentProfile.display_name, myColor]);

  const itemsByCell = useMemo(() => {
    const m = new Map<string, RoomItem>();
    items.filter(i => i.gx !== null && i.gy !== null && i.owner_id === null && !i.wall_side).forEach(i => m.set(`${i.gx},${i.gy}`, i));
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
    : { width: "min(98vw, 1440px)", height: "min(94dvh, 860px)" };

  const renderTypingBubble = (ax: number, ay: number, yOffset: number = 0) => {
    const frames = ["●  ○  ○", "○  ●  ○", "○  ○  ●"];
    const bw = 50; const bh = 22;
    const bTop = ay - bh - yOffset;
    return (
      <g>
        <rect x={ax - bw / 2} y={bTop} width={bw} height={bh} rx={11} fill="white" opacity={0.92} />
        <polygon points={`${ax - 4},${bTop + bh} ${ax + 4},${bTop + bh} ${ax},${bTop + bh + 7}`} fill="white" opacity={0.92} />
        <text x={ax} y={bTop + 15} textAnchor="middle" fontSize={9} fill="#374151" letterSpacing="1">{frames[typingFrame]}</text>
      </g>
    );
  };

  const renderSvgBubble = (ax: number, ay: number, text: string, _color: string, _opacity: number, yOffset: number = 0, showTail: boolean = true) => {
    const truncated = text.length > 100 ? text.slice(0, 100) + "…" : text;
    // Break long words at 18 chars to prevent horizontal overflow
    const allWords: string[] = [];
    truncated.split(" ").forEach(w => { for (let i = 0; i < w.length; i += 18) allWords.push(w.slice(i, i + 18)); });
    const lines: string[] = [];
    let cur = "";
    allWords.forEach(w => { const n = cur ? `${cur} ${w}` : w; if (n.length > 18 && cur) { lines.push(cur); cur = w; } else { cur = n; } });
    if (cur) lines.push(cur);
    const capped = lines.slice(0, 3);
    const lineH = 15;
    const padH = 12;
    const padV = 8;
    const bw = Math.min(180, Math.max(64, capped.reduce((m, l) => Math.max(m, l.length), 0) * 6.5 + padH * 2));
    const bh = capped.length * lineH + padV * 2;
    const bTop = ay - bh - yOffset;
    return (
      <g>
        {/* Drop shadow */}
        <rect x={ax - bw / 2 + 2} y={bTop + 2} width={bw} height={bh} rx={12} fill="rgba(0,0,0,0.22)" />
        {/* Bubble */}
        <rect x={ax - bw / 2} y={bTop} width={bw} height={bh} rx={12} fill="white" stroke="rgba(0,0,0,0.06)" strokeWidth={0.8} />
        {/* Tail */}
        {showTail && <polygon points={`${ax - 6},${bTop + bh} ${ax + 6},${bTop + bh} ${ax},${bTop + bh + 9}`} fill="white" />}
        {capped.map((line, i) => (
          <text key={i} x={ax} y={bTop + padV + 11 + i * lineH} textAnchor="middle" fontSize={11} fontFamily="system-ui,sans-serif" fontWeight="600" fill="#111827">{line}</text>
        ))}
      </g>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const extensionOpen = rightPanel !== "hidden";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setCtxMenu(null)}>
      {/* Animated starfield background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ background: "radial-gradient(ellipse at 45% 35%, #0d1028 0%, #060810 50%, #02030a 100%)" }}>
        <style>{`
          @keyframes drift1{0%,100%{transform:translate(0,0)}33%{transform:translate(14px,-10px)}66%{transform:translate(-6px,8px)}}
          @keyframes drift2{0%,100%{transform:translate(0,0)}40%{transform:translate(-12px,16px)}70%{transform:translate(8px,-4px)}}
          @keyframes drift3{0%,100%{transform:translate(0,0)}50%{transform:translate(10px,12px)}}
          @keyframes nebulaPulse{0%,100%{opacity:0.055;transform:scale(1)}50%{opacity:0.09;transform:scale(1.08)}}
          @keyframes shootStar{0%{opacity:0;transform:translateX(0) translateY(0) scaleX(1)}3%{opacity:1}18%{opacity:0;transform:translateX(220px) translateY(90px) scaleX(3)}100%{opacity:0}}
        `}</style>

        {/* Nebula glows */}
        <div style={{ position:"absolute", top:"15%", left:"20%", width:500, height:350, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(79,70,229,0.07) 0%,transparent 65%)", animation:"nebulaPulse 18s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:"55%", left:"55%", width:380, height:260, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(139,92,246,0.06) 0%,transparent 60%)", animation:"nebulaPulse 24s ease-in-out infinite reverse" }} />
        <div style={{ position:"absolute", top:"30%", left:"70%", width:280, height:200, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(6,182,212,0.04) 0%,transparent 60%)", animation:"nebulaPulse 30s ease-in-out infinite" }} />

        {/* Layer 1 — small distant stars, slow drift */}
        {Array.from({ length: 55 }).map((_, i) => {
          const x = (i * 137.508 + 23) % 100;
          const y = (i * 97.3 + 41) % 100;
          return <div key={i} style={{ position:"absolute", left:`${x}%`, top:`${y}%`, width:1, height:1, borderRadius:"50%", background:"white", opacity:0.18+(i%5)*0.06, animation:`drift${(i%3)+1} ${22+i%18}s ${-(i*1.7)%20}s ease-in-out infinite, pulse ${3+i%3}s ${(i*0.4)%4}s ease-in-out infinite alternate` }} />;
        })}

        {/* Layer 2 — medium stars, medium drift */}
        {Array.from({ length: 40 }).map((_, i) => {
          const x = ((i+55) * 137.508 + 73) % 100;
          const y = ((i+55) * 97.3 + 61) % 100;
          const sz = i%7===0 ? 1.5 : 1;
          return <div key={i+55} style={{ position:"absolute", left:`${x}%`, top:`${y}%`, width:sz, height:sz, borderRadius:"50%", background:"white", opacity:0.28+(i%4)*0.09, animation:`drift${((i+1)%3)+1} ${16+i%12}s ${-(i*2.1)%16}s ease-in-out infinite, pulse ${2.5+i%2}s ${(i*0.6)%5}s ease-in-out infinite alternate` }} />;
        })}

        {/* Layer 3 — bright accent stars */}
        {Array.from({ length: 18 }).map((_, i) => {
          const x = ((i+95) * 137.508 + 11) % 100;
          const y = ((i+95) * 97.3 + 79) % 100;
          const purple = i%3===0;
          return <div key={i+95} style={{ position:"absolute", left:`${x}%`, top:`${y}%`, width:2, height:2, borderRadius:"50%", background:purple?"rgba(167,139,250,0.85)":"white", opacity:0.55+(i%3)*0.15, boxShadow:purple?`0 0 5px 1px rgba(139,92,246,0.35)`:i%4===0?"0 0 4px 1px rgba(255,255,255,0.2)":undefined, animation:`drift1 ${28+i*2}s ${-(i*3)}s ease-in-out infinite, pulse 2s ${i*0.5}s ease-in-out infinite alternate` }} />;
        })}

        {/* Occasional shooting star */}
        {Array.from({ length: 3 }).map((_, i) => {
          const x = (i * 33 + 10) % 80;
          const y = (i * 27 + 5) % 40;
          return <div key={`shoot-${i}`} style={{ position:"absolute", left:`${x}%`, top:`${y}%`, width:2, height:1, borderRadius:"50%", background:"linear-gradient(90deg,white,transparent)", opacity:0, animation:`shootStar ${8+i*5}s ${i*7}s ease-out infinite` }} />;
        })}
      </div>
      <div className="flex items-stretch max-sm:w-screen max-sm:h-[100dvh]" onClick={e => e.stopPropagation()}>
      <div className={`relative flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_120px_rgba(99,102,241,0.07)] border border-white/[0.1] bg-gradient-to-b from-[#060d1a] to-[#04090f] max-sm:!rounded-none max-sm:border-0 ${extensionOpen && !fullscreen ? "sm:rounded-l-2xl sm:rounded-r-none" : "sm:rounded-2xl"}`} style={windowStyle}>

        {/* Header */}
        <div className="flex-shrink-0 flex flex-col" style={{ background: "linear-gradient(180deg,#07101e 0%,#040c18 100%)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <style>{`
            @keyframes xpShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
            @keyframes coinPulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
          `}</style>
          <div className="flex items-center px-3 sm:px-4 gap-3" style={{ height: "48px" }}>
            {/* Left: app name + room name */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* App icon */}
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(139,92,246,0.4)]">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
              </div>
              <span className="hidden sm:block text-[13px] font-bold text-white/50 tracking-tight flex-shrink-0">ChatApp</span>
              <div className="hidden sm:block w-px h-3.5 bg-white/[0.1] flex-shrink-0" />
              {/* Room */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                <span className="text-[15px] font-bold text-white tracking-tight truncate">#{activeRoomName}</span>
                {activeRoomType === "shop" && <span className="hidden sm:flex text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Shop</span>}
                {activeRoomType === "casino" && <span className="hidden sm:flex text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Casino</span>}
              </div>
            </div>

            {/* Right: unified stats pill (fullscreen only) + actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Stats pill — only shown in fullscreen mode */}
              {fullscreen && (
                <div
                  className="flex items-stretch rounded-2xl overflow-hidden border border-white/[0.07]"
                  style={{ background: "linear-gradient(135deg,rgba(10,15,28,0.98),rgba(6,10,20,0.98))", boxShadow: "0 2px 12px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04)" }}
                >
                  {/* Level */}
                  <button
                    onClick={() => setShowLevelGuide(v => !v)}
                    className={`flex items-center gap-1.5 px-3.5 transition-colors h-full hover:bg-violet-500/10`}
                    title="Klik for at se niveau-oversigt"
                  >
                    <span className="text-[9px] font-black tracking-[0.2em] uppercase" style={{ color: "#6d28d9" }}>LV</span>
                    <span className="text-[16px] font-black text-white tabular-nums leading-none">{level}</span>
                  </button>

                  <div className="w-px bg-white/[0.06] my-2.5" />

                  {/* XP */}
                  <div className="hidden sm:flex items-center px-3.5">
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.22)" }}>
                      <span style={{ color: "#8b5cf6" }}>{xpInCurrentLevel(xp)}</span>/{xpForNextLevel(xp) || "MAX"} xp
                    </span>
                  </div>

                  <div className="w-px bg-white/[0.06] my-2.5" />

                  {/* Coins */}
                  <div className="flex items-center gap-1.5 px-3.5">
                    <span className="text-sm leading-none">🪙</span>
                    <span className="text-[14px] font-black tabular-nums leading-none" style={{ color: "#f59e0b" }}>{coins}</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-0.5">
                <button onClick={() => setFullscreen(f => !f)} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-200 hover:bg-white/[0.06] transition-all">{fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</button>
                <button onClick={handleLogout} className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-all" title="Log ud"><LogOut className="w-3.5 h-3.5" /></button>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          {/* XP glow bar */}
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[9px] font-bold tabular-nums flex-shrink-0" style={{ color: "rgba(139,92,246,0.55)" }}>{xpInCurrentLevel(xp)}/{xpForNextLevel(xp) || "MAX"} XP</span>
            <div className="flex-1 h-0.5 bg-white/[0.03] relative overflow-hidden">
              <div
                className="h-full transition-[width] duration-700"
                style={{ width: `${xpForNextLevel(xp) ? (xpInCurrentLevel(xp) / xpForNextLevel(xp) * 100) : 100}%`, background: "linear-gradient(90deg,#5b21b6,#8b5cf6,#a78bfa)", boxShadow: "0 0 6px rgba(139,92,246,0.8)" }}
              />
            </div>
            <span className="text-[9px] font-bold px-1 flex-shrink-0" style={{ color: "rgba(139,92,246,0.4)" }}>LV {level + 1}</span>
          </div>
          {/* LV + coins row (non-fullscreen only) */}
          {!fullscreen && (
            <div className="flex items-center justify-end gap-3 px-3 py-1">
              <button onClick={() => setShowLevelGuide(v => !v)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity" title="Se niveau-oversigt">
                <span className="text-[9px] font-black tracking-[0.18em] uppercase" style={{ color: "#6d28d9" }}>LV</span>
                <span className="text-[15px] font-black tabular-nums text-white leading-none">{level}</span>
              </button>
              <span className="w-px h-3 bg-white/[0.08]" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">🪙</span>
                <span className="text-[15px] font-black tabular-nums leading-none" style={{ color: "#f59e0b" }}>{coins}</span>
              </div>
            </div>
          )}
          {/* Placing hint */}
          {(movingBotId || placingItem) && (
            <div className="px-4 py-1 bg-violet-600/10 border-t border-violet-500/15 text-center">
              <span className="text-[12px] text-violet-300 font-semibold animate-pulse">
                {movingBotId ? "Klik på et felt for at placere bot" : isWallItemType(placingItem!.item.item_type) ? "Klik på væggen for at hænge op" : `Klik på et felt · R = roter (${placingItem!.rotation * 90}°)`}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">

          {/* Isometric room */}
          <div
            ref={roomDivRef}
            className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
            style={{ background: activeRoomType === "solarie" ? "#0f0a02" : theme.even }}
            onPointerDown={e => {
              if (e.button !== 0) return;
              dragStartRef.current = { cx: e.clientX, cy: e.clientY, px: panRef.current.x, py: panRef.current.y };
              isDraggingRef.current = false;
            }}
            onPointerMove={e => {
              if (!dragStartRef.current) return;
              const dx = e.clientX - dragStartRef.current.cx;
              const dy = e.clientY - dragStartRef.current.cy;
              if (!isDraggingRef.current && Math.abs(dx) + Math.abs(dy) > 5) {
                isDraggingRef.current = true;
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              }
              if (!isDraggingRef.current) return;
              const svg = svgRef.current;
              if (!svg) return;
              const ctm = svg.getScreenCTM();
              if (!ctm) return;
              const nx = dragStartRef.current.px - dx / ctm.a;
              const ny = dragStartRef.current.py - dy / ctm.d;
              panRef.current = { x: nx, y: ny };
              setPan({ x: nx, y: ny });
            }}
            onPointerUp={() => { dragStartRef.current = null; setTimeout(() => { isDraggingRef.current = false; }, 0); }}
            onPointerLeave={() => { if (!isDraggingRef.current) dragStartRef.current = null; }}
            onWheel={e => { setZoom(z => parseFloat(Math.max(0.4, Math.min(2.5, z + (e.deltaY < 0 ? 0.1 : -0.1))).toFixed(2))); }}
          >
            {/* Room starfield */}
            {activeRoomType !== "solarie" && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 35 }).map((_, i) => {
                  const x = (i * 137.508 + 7) % 100;
                  const y = (i * 91.3 + 19) % 100;
                  const sz = i % 9 === 0 ? 1.5 : 1;
                  return <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: sz, height: sz, borderRadius: "50%", background: i % 6 === 0 ? "rgba(167,139,250,0.7)" : "white", opacity: 0.12 + (i % 5) * 0.06, animation: `drift${(i % 3) + 1} ${20 + i % 14}s ${-(i * 1.9) % 18}s ease-in-out infinite, pulse ${2 + i % 3}s ${(i * 0.5) % 4}s ease-in-out infinite alternate` }} />;
                })}
              </div>
            )}

            <svg ref={svgRef} viewBox={roomViewBox}
              preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
              {/* Background fills entire visible area regardless of viewBox */}
              <defs>
                {/* Alien color tint filters */}
                {AVATAR_TINT_COLORS.map(c => (
                  <filter key={c} id={`alien-tint-${c.slice(1)}`} colorInterpolationFilters="sRGB">
                    <feFlood floodColor={c} result="flood"/>
                    <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask"/>
                    <feBlend in="mask" in2="SourceGraphic" mode="color"/>
                  </filter>
                ))}
                {/* Suntan overlay filters */}
                {TAN_LEVELS.slice(1).map((t, i) => t && (
                  <filter key={i + 1} id={`suntan-${i + 1}`} colorInterpolationFilters="sRGB">
                    <feFlood floodColor={t.color} result="flood"/>
                    <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask"/>
                    <feBlend in="mask" in2="SourceGraphic" mode="multiply"/>
                  </filter>
                ))}
                {/* Nebula glow gradient */}
                <radialGradient id="nebula1" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={theme.color} stopOpacity="0.12"/>
                  <stop offset="100%" stopColor={theme.color} stopOpacity="0"/>
                </radialGradient>
                <radialGradient id="nebula2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.08"/>
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0"/>
                </radialGradient>
                {/* Solarie warm glow gradient */}
                <radialGradient id="solarie-glow" cx="50%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.18"/>
                  <stop offset="60%" stopColor="#f97316" stopOpacity="0.08"/>
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
                </radialGradient>
              </defs>

              <rect x={-svgW * 2} y={-svgH * 2} width={svgW * 6} height={svgH * 6} fill={theme.even} />

              {/* ── Galaxy background ── */}
              {activeRoomType !== "solarie" && (
                <>
                  {/* Nebula blobs */}
                  <ellipse cx={svgW * 0.2} cy={-svgH * 0.3} rx={svgW * 1.2} ry={svgH * 0.9} fill="url(#nebula1)" />
                  <ellipse cx={svgW * 1.1} cy={svgH * 0.1} rx={svgW * 0.9} ry={svgH * 0.7} fill="url(#nebula2)" />
                  {/* Stars */}
                  {stars.map((s, i) => (
                    <circle key={i} cx={svgW / 2 + s.x} cy={svgH * 0.3 + s.y} r={s.r} fill="white">
                      <animate attributeName="opacity" values={`${s.op};${Math.min(1, s.op + 0.4)};${s.op}`} dur={`${s.dur}s`} begin={`${s.delay}s`} repeatCount="indefinite"/>
                    </circle>
                  ))}
                </>
              )}
              {/* ── Solarie UV rays background ── */}
              {activeRoomType === "solarie" && (() => {
                const cx = svgW / 2; const cy = -svgH * 0.5;
                return (
                  <>
                    {/* Warm ambient glow */}
                    <rect x={-svgW * 2} y={-svgH * 2} width={svgW * 6} height={svgH * 6} fill="url(#solarie-glow)" />
                    {/* UV rays — 12 beams radiating from top center */}
                    {Array.from({ length: 12 }).map((_, i) => {
                      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
                      const len = Math.max(svgW, svgH) * 2.5;
                      const ex = cx + Math.cos(angle) * len;
                      const ey = cy + Math.sin(angle) * len;
                      const opacity = (i % 3 === 0 ? 0.06 : 0.03);
                      const delay = (i * 0.18).toFixed(2);
                      const dur = (2.4 + (i % 4) * 0.4).toFixed(1);
                      return (
                        <line key={i} x1={cx} y1={cy} x2={ex} y2={ey}
                          stroke="#fbbf24" strokeWidth={i % 2 === 0 ? 18 : 9}
                          strokeLinecap="round" opacity={opacity}>
                          <animate attributeName="opacity" values={`${opacity};${opacity * 2.5};${opacity}`} dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
                        </line>
                      );
                    })}
                    {/* Sun disc */}
                    <circle cx={cx} cy={cy} r={28} fill="#fde68a" opacity={0.25}>
                      <animate attributeName="opacity" values="0.2;0.35;0.2" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={cx} cy={cy} r={14} fill="#fef3c7" opacity={0.45}>
                      <animate attributeName="opacity" values="0.4;0.6;0.4" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  </>
                );
              })()}

              {/* ── Back walls ── */}
              {(() => {
                const tcx = svgW / 2;
                const tcy = OFFSET_Y - TH / 2;
                const rBR = { x: tcx + roomCols * TW / 2, y: tcy + roomCols * TH / 2 };
                const lBL = { x: tcx - roomRows * TW / 2, y: tcy + roomRows * TH / 2 };
                const apex = { x: tcx, y: tcy - WALL_H };

                const isWallPlacing = !!placingItem && isWallItemType(placingItem.item.item_type);

                const getSvgPos = (e: React.MouseEvent): { x: number; y: number } => {
                  const svg = svgRef.current;
                  if (!svg) return { x: 0, y: 0 };
                  const pt = svg.createSVGPoint();
                  pt.x = e.clientX; pt.y = e.clientY;
                  const m = svg.getScreenCTM();
                  if (!m) return { x: 0, y: 0 };
                  const inv = pt.matrixTransform(m.inverse());
                  return { x: inv.x, y: inv.y };
                };

                const handleWallClick = (e: React.MouseEvent, side: "right" | "left") => {
                  if (!isWallPlacing) return;
                  e.stopPropagation();
                  const { x: sx, y: sy } = getSvgPos(e);
                  if (side === "right") {
                    const t = Math.max(0.05, Math.min(0.95, (sx - tcx) / (rBR.x - tcx)));
                    const baseY = tcy + t * (rBR.y - tcy);
                    const wh = Math.max(20, Math.min(WALL_H - 20, baseY - sy));
                    placeWallItem("right", t, Math.round(wh));
                  } else {
                    const t = Math.max(0.05, Math.min(0.95, (tcx - sx) / (tcx - lBL.x)));
                    const baseY = tcy + t * (lBL.y - tcy);
                    const wh = Math.max(20, Math.min(WALL_H - 20, baseY - sy));
                    placeWallItem("left", t, Math.round(wh));
                  }
                };
                const handleWallContextMenu = (e: React.MouseEvent, side: "left" | "right") => {
                  e.preventDefault(); e.stopPropagation();
                  if (isWallPlacing) return;
                  const canEdit = isAdmin || (activeRoomType === "spaceship" && activeRoomOwnerId === currentProfile.id);
                  if (!canEdit) return;
                  const { x: sx } = getSvgPos(e);
                  const t = side === "right"
                    ? Math.max(0.08, Math.min(0.92, (sx - tcx) / (rBR.x - tcx)))
                    : Math.max(0.08, Math.min(0.92, (tcx - sx) / (tcx - lBL.x)));
                  setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "wall", wallSide: side, wallPosition: t });
                };

                // Portal render helper
                const renderPortal = (portal: RoomPortal) => {
                  const unitW = 0.15;
                  const w = unitW * portal.size;
                  const t = portal.position;
                  const dH = portal.portal_type === "door" ? 56 + portal.size * 8 : 38 + portal.size * 4;
                  const winBottomOffset = portal.portal_type === "window" ? WALL_H * 0.26 : 0;

                  let BL: {x:number;y:number}, BR: {x:number;y:number}, TL: {x:number;y:number}, TR: {x:number;y:number};
                  if (portal.wall_side === "left") {
                    const lx = (u: number) => tcx - u * (tcx - lBL.x);
                    const ly = (u: number) => tcy + u * (lBL.y - tcy);
                    BL = { x: lx(t - w/2), y: ly(t - w/2) - winBottomOffset };
                    BR = { x: lx(t + w/2), y: ly(t + w/2) - winBottomOffset };
                  } else {
                    const rx = (u: number) => tcx + u * (rBR.x - tcx);
                    const ry = (u: number) => tcy + u * (rBR.y - tcy);
                    BL = { x: rx(t - w/2), y: ry(t - w/2) - winBottomOffset };
                    BR = { x: rx(t + w/2), y: ry(t + w/2) - winBottomOffset };
                  }
                  TL = { x: BL.x, y: BL.y - dH };
                  TR = { x: BR.x, y: BR.y - dH };

                  const pts = `${BL.x},${BL.y} ${BR.x},${BR.y} ${TR.x},${TR.y} ${TL.x},${TL.y}`;
                  const fW = 3.5;
                  const framePts = `${BL.x-fW},${BL.y+1} ${BR.x+fW},${BR.y+1} ${TR.x+fW},${TR.y-fW} ${TL.x-fW},${TL.y-fW}`;
                  const midX = (BL.x + BR.x + TR.x + TL.x) / 4;
                  const midY = (BL.y + BR.y + TR.y + TL.y) / 4;
                  const targetRoom = rooms.find(r => r.id === portal.target_room_id);
                  const canEdit = isAdmin || (activeRoomType === "spaceship" && activeRoomOwnerId === currentProfile.id);

                  if (portal.portal_type === "door") {
                    return (
                      <g key={portal.id}
                        style={{ cursor: targetRoom ? "pointer" : "default" }}
                        onClick={() => { if (targetRoom) switchRoom(targetRoom.id, targetRoom.name, targetRoom.cols, targetRoom.rows, targetRoom.room_type, targetRoom.theme_key, targetRoom.floor_pattern, targetRoom.owner_id); }}
                        onContextMenu={canEdit ? e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "portal", portal }); } : undefined}
                      >
                        {/* Frame */}
                        <polygon points={framePts} fill={theme.color + "50"} stroke={theme.color} strokeWidth={1} opacity={0.7} />
                        {/* Door fill */}
                        <polygon points={pts} fill="#050d1a" opacity={0.92} />
                        <polygon points={pts} fill={theme.color} opacity={0.07} />
                        {/* Door frame lines */}
                        <line x1={TL.x} y1={TL.y} x2={TR.x} y2={TR.y} stroke={theme.color} strokeWidth={1.5} opacity={0.8} />
                        <line x1={BL.x} y1={BL.y} x2={TL.x} y2={TL.y} stroke={theme.color} strokeWidth={1.2} opacity={0.6} />
                        <line x1={BR.x} y1={BR.y} x2={TR.x} y2={TR.y} stroke={theme.color} strokeWidth={1.2} opacity={0.6} />
                        {/* Arrow indicator */}
                        <text x={midX} y={midY + 3} textAnchor="middle" fontSize={10} fill={theme.color} opacity={0.9}
                          fontFamily="system-ui,sans-serif" style={{ pointerEvents: "none" }}>▶</text>
                        {/* Room name label above door */}
                        {targetRoom && (
                          <text x={midX} y={TL.y - 4} textAnchor="middle" fontSize={6.5} fontWeight="700"
                            fill={theme.color} opacity={0.85} fontFamily="system-ui,sans-serif"
                            stroke="rgba(0,0,0,0.8)" strokeWidth={2} paintOrder="stroke"
                            style={{ pointerEvents: "none" }}>
                            {targetRoom.name}
                          </text>
                        )}
                        {/* Threshold line at base */}
                        <line x1={BL.x} y1={BL.y} x2={BR.x} y2={BR.y} stroke={theme.color} strokeWidth={1.5} opacity={0.5} />
                      </g>
                    );
                  } else {
                    // Window — space view
                    const clipId = `wclip-${portal.id}`;
                    // Deterministic pseudo-random from portal.id string
                    const seed = portal.id.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xfffff, 0);
                    const rng = (n: number) => { let s = seed + n * 7919; s = ((s >> 16) ^ s) * 0x45d9f3b & 0xfffff; return (s & 0xffff) / 0xffff; };
                    // Stars
                    const starCount = 18 + Math.floor(rng(0) * 14);
                    const wBox = { minX: Math.min(BL.x,TL.x)-2, maxX: Math.max(BR.x,TR.x)+2, minY: Math.min(TL.y,TR.y)-2, maxY: Math.max(BL.y,BR.y)+2 };
                    const bW = wBox.maxX - wBox.minX, bH = wBox.maxY - wBox.minY;
                    // Celestial body: planet / moon / sun — pick by seed
                    const bodyType = Math.floor(rng(1) * 3); // 0=planet, 1=moon, 2=sun
                    const bodyX = wBox.minX + bW * (0.2 + rng(2) * 0.6);
                    const bodyY = wBox.minY + bH * (0.15 + rng(3) * 0.55);
                    const bodyR = 5 + rng(4) * 8;
                    const planetColors = [["#6b46c1","#8b5cf6"],["#065f46","#10b981"],["#b45309","#f59e0b"],["#1d4ed8","#3b82f6"],["#be185d","#ec4899"]];
                    const [pDark, pLight] = planetColors[Math.floor(rng(5) * planetColors.length)];
                    // Nebula center
                    const nebX = wBox.minX + bW * (0.1 + rng(6) * 0.8);
                    const nebY = wBox.minY + bH * (0.1 + rng(7) * 0.8);
                    return (
                      <g key={portal.id}
                        onContextMenu={canEdit ? e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "portal", portal }); } : undefined}
                        style={{ cursor: canEdit ? "context-menu" : "default" }}
                      >
                        <defs>
                          <clipPath id={clipId}>
                            <polygon points={pts} />
                          </clipPath>
                        </defs>
                        {/* Frame */}
                        <polygon points={framePts} fill={theme.color + "30"} stroke={theme.color} strokeWidth={0.8} opacity={0.6} />
                        {/* Space background */}
                        <polygon points={pts} fill="#00010a" />
                        {/* Space scene clipped to window */}
                        <g clipPath={`url(#${clipId})`} style={{ pointerEvents: "none" }}>
                          {/* Nebula glow */}
                          <ellipse cx={nebX} cy={nebY} rx={bW * 0.45} ry={bH * 0.35}
                            fill={pDark} opacity={0.18} style={{ filter: "blur(4px)" }} />
                          {/* Stars */}
                          {Array.from({ length: starCount }, (_, i) => {
                            const sx = wBox.minX + rng(i + 10) * bW;
                            const sy = wBox.minY + rng(i + 30) * bH;
                            const sr = 0.4 + rng(i + 50) * 1.1;
                            const bright = rng(i + 70);
                            const twinkle = bright > 0.75;
                            return (
                              <circle key={i} cx={sx} cy={sy} r={sr} fill="white" opacity={0.5 + bright * 0.5}>
                                {twinkle && <animate attributeName="opacity" values={`${0.4 + bright * 0.4};1;${0.4 + bright * 0.4}`} dur={`${1.2 + rng(i + 90) * 2}s`} repeatCount="indefinite" />}
                              </circle>
                            );
                          })}
                          {/* Celestial body */}
                          {bodyType === 0 && (
                            // Planet with bands
                            <g>
                              <circle cx={bodyX} cy={bodyY} r={bodyR * 1.4} fill={pDark} opacity={0.15} />
                              <circle cx={bodyX} cy={bodyY} r={bodyR} fill={pDark} />
                              <ellipse cx={bodyX} cy={bodyY - bodyR * 0.15} rx={bodyR * 0.85} ry={bodyR * 0.2} fill={pLight} opacity={0.4} />
                              <ellipse cx={bodyX} cy={bodyY + bodyR * 0.25} rx={bodyR * 0.7} ry={bodyR * 0.15} fill={pLight} opacity={0.25} />
                              <circle cx={bodyX - bodyR * 0.25} cy={bodyY - bodyR * 0.2} r={bodyR * 0.22} fill="rgba(255,255,255,0.12)" />
                            </g>
                          )}
                          {bodyType === 1 && (
                            // Moon — grey with craters
                            <g>
                              <circle cx={bodyX} cy={bodyY} r={bodyR} fill="#9ca3af" />
                              <circle cx={bodyX + bodyR * 0.3} cy={bodyY - bodyR * 0.3} r={bodyR * 0.28} fill="#6b7280" />
                              <circle cx={bodyX - bodyR * 0.35} cy={bodyY + bodyR * 0.2} r={bodyR * 0.18} fill="#6b7280" />
                              <circle cx={bodyX + bodyR * 0.1} cy={bodyY + bodyR * 0.4} r={bodyR * 0.12} fill="#6b7280" />
                              <circle cx={bodyX - bodyR * 0.2} cy={bodyY - bodyR * 0.1} r={bodyR * 0.32} fill="rgba(255,255,255,0.1)" />
                            </g>
                          )}
                          {bodyType === 2 && (
                            // Sun with corona
                            <g>
                              <circle cx={bodyX} cy={bodyY} r={bodyR * 1.8} fill="#fef3c7" opacity={0.06}>
                                <animate attributeName="opacity" values="0.04;0.1;0.04" dur="2.5s" repeatCount="indefinite" />
                              </circle>
                              <circle cx={bodyX} cy={bodyY} r={bodyR * 1.3} fill="#fde68a" opacity={0.15}>
                                <animate attributeName="opacity" values="0.12;0.22;0.12" dur="1.8s" repeatCount="indefinite" />
                              </circle>
                              <circle cx={bodyX} cy={bodyY} r={bodyR} fill="#fef9c3" />
                              <circle cx={bodyX} cy={bodyY} r={bodyR * 0.75} fill="#fde047" />
                              <circle cx={bodyX - bodyR * 0.2} cy={bodyY - bodyR * 0.25} r={bodyR * 0.25} fill="rgba(255,255,255,0.3)" />
                            </g>
                          )}
                          {/* Distant galaxy smudge */}
                          {rng(8) > 0.4 && (
                            <ellipse
                              cx={wBox.minX + bW * rng(9)}
                              cy={wBox.minY + bH * rng(10)}
                              rx={bW * 0.12} ry={bH * 0.04}
                              fill="white" opacity={0.08}
                              transform={`rotate(${rng(11) * 60 - 30},${wBox.minX + bW * rng(9)},${wBox.minY + bH * rng(10)})`}
                            />
                          )}
                        </g>
                        {/* Window cross frame */}
                        <line x1={(TL.x+BL.x)/2} y1={(TL.y+BL.y)/2} x2={(TR.x+BR.x)/2} y2={(TR.y+BR.y)/2}
                          stroke={theme.color} strokeWidth={1} opacity={0.5} />
                        <line x1={(TL.x+TR.x)/2} y1={(TL.y+TR.y)/2} x2={(BL.x+BR.x)/2} y2={(BL.y+BR.y)/2}
                          stroke={theme.color} strokeWidth={1} opacity={0.5} />
                        {/* Glass sheen */}
                        <polygon points={pts} fill="rgba(150,200,255,0.04)" />
                        <polygon points={`${TL.x+2},${TL.y+2} ${TL.x+10},${TL.y+2} ${TL.x+2},${TL.y+8}`} fill="rgba(255,255,255,0.22)" style={{ pointerEvents: "none" }} />
                        {/* Outer frame lines */}
                        <line x1={TL.x} y1={TL.y} x2={TR.x} y2={TR.y} stroke={theme.color} strokeWidth={1.2} opacity={0.7} />
                        <line x1={BL.x} y1={BL.y} x2={BR.x} y2={BR.y} stroke={theme.color} strokeWidth={1.2} opacity={0.7} />
                        <line x1={BL.x} y1={BL.y} x2={TL.x} y2={TL.y} stroke={theme.color} strokeWidth={1} opacity={0.5} />
                        <line x1={BR.x} y1={BR.y} x2={TR.x} y2={TR.y} stroke={theme.color} strokeWidth={1} opacity={0.5} />
                      </g>
                    );
                  }
                };

                // ── Wall item renderer ──
                const wallItems = items.filter(i => i.wall_side !== null && i.owner_id === null);

                // Dartboard SVG helper — centered at (0,0), R = radius
                const dartboardSvg = (R: number) => {
                  const N = 20;
                  const segPath = (idx: number, r1: number, r2: number) => {
                    const a1 = (idx / N) * 2 * Math.PI - Math.PI / 2;
                    const a2 = ((idx + 1) / N) * 2 * Math.PI - Math.PI / 2;
                    const x1 = r1 * Math.cos(a1), y1 = r1 * Math.sin(a1);
                    const x2 = r1 * Math.cos(a2), y2 = r1 * Math.sin(a2);
                    const x3 = r2 * Math.cos(a2), y3 = r2 * Math.sin(a2);
                    const x4 = r2 * Math.cos(a1), y4 = r2 * Math.sin(a1);
                    if (r1 < 0.5) return `M 0 0 L ${x4} ${y4} A ${r2} ${r2} 0 0 1 ${x3} ${y3} Z`;
                    return `M ${x1} ${y1} A ${r1} ${r1} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${r2} ${r2} 0 0 0 ${x4} ${y4} Z`;
                  };
                  return (
                    <>
                      <circle r={R * 1.06} fill="#0a0a0a" />
                      {DART_WHEEL.map((num, i) => {
                        const isEven = i % 2 === 0;
                        const single = isEven ? "#1c1c1c" : "#d4c8a8";
                        const score  = isEven ? "#b71c1c" : "#1b5e20";
                        return (
                          <g key={i}>
                            <path d={segPath(i, R*0.60, R*0.88)} fill={single} stroke="#0a0a0a" strokeWidth={0.4} />
                            <path d={segPath(i, R*0.88, R*1.0)}  fill={score}  stroke="#0a0a0a" strokeWidth={0.4} />
                            <path d={segPath(i, R*0.50, R*0.60)} fill={score}  stroke="#0a0a0a" strokeWidth={0.4} />
                            <path d={segPath(i, R*0.16, R*0.50)} fill={single} stroke="#0a0a0a" strokeWidth={0.3} />
                          </g>
                        );
                      })}
                      <circle r={R*0.16} fill="#1b5e20" stroke="#0a0a0a" strokeWidth={0.5} />
                      <circle r={R*0.08} fill="#b71c1c" />
                      {[1.0, 0.88, 0.60, 0.50, 0.16].map(f => <circle key={f} r={R*f} fill="none" stroke="#55555588" strokeWidth={0.6} />)}
                      {DART_WHEEL.map((_, i) => {
                        const a = (i / N) * 2 * Math.PI - Math.PI / 2;
                        return <line key={i} x1={0} y1={0} x2={R * Math.cos(a)} y2={R * Math.sin(a)} stroke="#55555566" strokeWidth={0.4} />;
                      })}
                      {DART_WHEEL.map((num, i) => {
                        const a = (i + 0.5) / N * 2 * Math.PI - Math.PI / 2;
                        const nr = R * 1.15;
                        return (
                          <text key={i} x={nr * Math.cos(a)} y={nr * Math.sin(a) + R * 0.07}
                            textAnchor="middle" fontSize={R * 0.2} fill="white" fontWeight="700" style={{ pointerEvents: "none" }}>
                            {num}
                          </text>
                        );
                      })}
                    </>
                  );
                };

                const renderWallItemSvg = (item: RoomItem) => {
                  const t = item.wall_pos ?? 0.5;
                  const wh = item.wall_height ?? 55;
                  const scale = item.item_scale ?? 1;
                  const hwx = 20; const hwy = 10; const hh = 22; // half-dims
                  let frame: number[][], canvas: number[][];
                  let cx: number, cy: number;
                  if (item.wall_side === "right") {
                    cx = tcx + t * roomCols * TW / 2;
                    cy = tcy + t * roomCols * TH / 2 - wh;
                    frame  = [[cx-hwx-3,cy-hwy-3-hh],[cx+hwx+3,cy+hwy+3-hh],[cx+hwx+3,cy+hwy+3+hh],[cx-hwx-3,cy-hwy-3+hh]];
                    canvas = [[cx-hwx, cy-hwy-hh],[cx+hwx,cy+hwy-hh],[cx+hwx,cy+hwy+hh],[cx-hwx,cy-hwy+hh]];
                  } else {
                    cx = tcx - t * roomRows * TW / 2;
                    cy = tcy + t * roomRows * TH / 2 - wh;
                    frame  = [[cx+hwx+3,cy-hwy-3-hh],[cx-hwx-3,cy+hwy+3-hh],[cx-hwx-3,cy+hwy+3+hh],[cx+hwx+3,cy-hwy-3+hh]];
                    canvas = [[cx+hwx,cy-hwy-hh],[cx-hwx,cy+hwy-hh],[cx-hwx,cy+hwy+hh],[cx+hwx,cy-hwy+hh]];
                  }
                  const fPts = frame.map(p => p.join(",")).join(" ");
                  const cPts = canvas.map(p => p.join(",")).join(" ");
                  const [tl, tr, br, bl] = canvas;

                  // ── Dartboard ──
                  if (item.item_type === "dartboard") {
                    const R = 22 * scale;
                    const game = dartGames.find(g => g.item_id === item.id && (g.status === "active" || g.status === "pending"));
                    // Scoreboard offset: along wall direction
                    const wallDirX = item.wall_side === "right" ? TW / 2 : -TW / 2;
                    const wallDirY = TH / 2;
                    const len = Math.hypot(wallDirX, wallDirY);
                    const sbOff = (R * 2.8 + 10);
                    const sbX = cx + (wallDirX / len) * sbOff;
                    const sbY = cy + (wallDirY / len) * sbOff;
                    const isMyGame = game && (game.player1_id === currentProfile.id || game.player2_id === currentProfile.id);
                    const isMyTurn = game && game.current_player_id === currentProfile.id && game.status === "active";
                    // Throwing zone tile for this board
                    const zoneGx = item.wall_side === "left" ? 4 : Math.round(t * (roomCols - 1));
                    const zoneGy = item.wall_side === "left" ? Math.round(t * (roomRows - 1)) : 4;
                    const onZone = myPos.gx === zoneGx && myPos.gy === zoneGy;
                    return (
                      <g key={`wall-${item.id}`}>
                        {/* Circular backing plate */}
                        <circle cx={cx} cy={cy} r={R * 1.2} fill="#2a1a0a" stroke="#8b6914" strokeWidth={2} style={{ cursor: "context-menu" }} onContextMenu={e => handleRightClick(e, null, item, null)} />
                        {/* Dartboard */}
                        <g transform={`translate(${cx},${cy})`} onContextMenu={e => handleRightClick(e, null, item, null)}
                          onDoubleClick={() => { if (isMyTurn && onZone && !dartAnimating && game) handleDartThrow(game); }}
                          style={{ cursor: isMyTurn && onZone ? "crosshair" : "context-menu" }}>
                          {dartboardSvg(R)}
                        </g>
                        {/* "Your turn" glow */}
                        {isMyTurn && <circle cx={cx} cy={cy} r={R * 1.25} fill="none" stroke="#fbbf24" strokeWidth={2} opacity={0.7}>
                          <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.2s" repeatCount="indefinite" />
                        </circle>}
                        {/* Scoreboard */}
                        {game && (() => {
                          const isP1 = game.player1_id === currentProfile.id || game.player2_id !== currentProfile.id;
                          const bw = 68, bh = 52;
                          const throws1 = game.current_player_id === game.player1_id ? game.throws_this_turn : 0;
                          const throws2 = game.current_player_id === game.player2_id ? game.throws_this_turn : 0;
                          return (
                            <g transform={`translate(${sbX},${sbY})`}
                              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ clientX: e.clientX, clientY: e.clientY, kind: "dartscoreboard", item }); }}
                              style={{ cursor: "context-menu" }}>
                              <rect x={-bw/2} y={-bh/2} width={bw} height={bh} rx={4} fill="#0f1a0f" stroke="#2d5a2d" strokeWidth={1.5} />
                              {/* P1 row */}
                              <text x={-bw/2+4} y={-bh/2+12} fontSize={7} fill={game.current_player_id === game.player1_id ? "#4ade80" : "#94a3b8"} fontWeight="700">{game.player1_name.slice(0,10)}</text>
                              <text x={bw/2-4} y={-bh/2+12} fontSize={10} fill={game.current_player_id === game.player1_id ? "#4ade80" : "white"} fontWeight="900" textAnchor="end">{game.player1_score}</text>
                              {game.current_player_id === game.player1_id && <text x={-bw/2+4} y={-bh/2+21} fontSize={6} fill="#fbbf24">{"●".repeat(game.throws_this_turn)}{"○".repeat(3 - game.throws_this_turn)}</text>}
                              {/* Divider */}
                              <line x1={-bw/2+3} y1={-bh/2+26} x2={bw/2-3} y2={-bh/2+26} stroke="#2d5a2d" strokeWidth={0.8} />
                              {/* P2 row */}
                              <text x={-bw/2+4} y={-bh/2+38} fontSize={7} fill={game.current_player_id === game.player2_id ? "#4ade80" : "#94a3b8"} fontWeight="700">{game.player2_name.slice(0,10)}</text>
                              <text x={bw/2-4} y={-bh/2+38} fontSize={10} fill={game.current_player_id === game.player2_id ? "#4ade80" : "white"} fontWeight="900" textAnchor="end">{game.player2_score}</text>
                              {game.current_player_id === game.player2_id && <text x={-bw/2+4} y={-bh/2+47} fontSize={6} fill="#fbbf24">{"●".repeat(game.throws_this_turn)}{"○".repeat(3 - game.throws_this_turn)}</text>}
                              {/* Status */}
                              {game.status === "pending" && <text x={0} y={bh/2-4} textAnchor="middle" fontSize={6} fill="#f59e0b" fontStyle="italic">Afventer...</text>}
                            </g>
                          );
                        })()}
                      </g>
                    );
                  }

                  // interior art (paintings/posters)
                  const sky = item.item_type === "painting"
                    ? <polygon points={[tl, tr, [tr[0],tl[1]+(br[1]-tl[1])*0.45],[tl[0],tl[1]+(bl[1]-tl[1])*0.45]].map(p=>p.join(",")).join(" ")} fill="#5b8ec8" />
                    : <polygon points={cPts} fill="#1a2540" />;
                  const ground = item.item_type === "painting"
                    ? <polygon points={[[tl[0],tl[1]+(bl[1]-tl[1])*0.45],[tr[0],tl[1]+(br[1]-tl[1])*0.45],br,bl].map(p=>p.join(",")).join(" ")} fill="#4a8c44" />
                    : null;
                  const cx2 = (tl[0]+tr[0]+br[0]+bl[0])/4;
                  const cy2 = (tl[1]+tr[1]+br[1]+bl[1])/4;
                  const star = item.item_type === "poster"
                    ? <text x={cx2} y={cy2+4} textAnchor="middle" fontSize={14} fill="white" opacity={0.85}>★</text>
                    : null;
                  return (
                    <g key={`wall-${item.id}`} onContextMenu={e => handleRightClick(e, null, item, null)} style={{ cursor: "context-menu" }}>
                      <polygon points={fPts} fill={item.item_type === "painting" ? "#5D2E0C" : "#1e3a5f"} />
                      <polygon points={cPts} fill={item.item_type === "painting" ? "#E8D5B0" : "#0d2040"} />
                      {sky}{ground}{star}
                    </g>
                  );
                };


                // ── Wall thickness: "into-room" offset per wall ──
                // Right wall is parallel to gx-axis; inward = -X direction = screen(-TW/2, +TH/2)
                // Left  wall is parallel to gy-axis; inward = -Y direction = screen(+TW/2, +TH/2)
                const WD_X = TW * 0.16;  // ≈ 12.8px screen-X per unit depth
                const WD_Y = TH * 0.16;  // ≈  6.4px screen-Y per unit depth
                // Right wall inward: left-diagonal direction
                const rFX = -WD_X, rFY = WD_Y;
                // Left wall inward: right-diagonal direction
                const lFX = WD_X, lFY = WD_Y;

                return (
                  <g>
                    {/* ── RIGHT WALL ── */}
                    {/* Main wall face */}
                    <polygon
                      points={`${tcx},${tcy} ${rBR.x},${rBR.y} ${rBR.x},${rBR.y - WALL_H} ${apex.x},${apex.y}`}
                      fill={theme.wallA}
                      onClick={e => handleWallClick(e, "right")}
                      onContextMenu={e => handleWallContextMenu(e, "right")}
                      style={{ cursor: isWallPlacing ? "crosshair" : "default" }}
                    />
                    {/* Panel division lines */}
                    {[0.33, 0.66].map(frac => (
                      <line key={`rp-${frac}`}
                        x1={tcx} y1={tcy - frac * WALL_H}
                        x2={rBR.x} y2={rBR.y - frac * WALL_H}
                        stroke={theme.color} strokeWidth={0.8} opacity={0.18}
                      />
                    ))}
                    {/* Baseboard */}
                    <polygon points={`${tcx},${tcy} ${rBR.x},${rBR.y} ${rBR.x},${rBR.y - 14} ${tcx},${tcy - 14}`} fill="rgba(0,0,0,0.35)" />
                    <line x1={tcx} y1={tcy - 14} x2={rBR.x} y2={rBR.y - 14} stroke={theme.color} strokeWidth={0.8} opacity={0.4} />
                    {/* Sci-fi circuit accent */}
                    <line x1={tcx + (rBR.x - tcx)*0.15} y1={tcy + (rBR.y - tcy)*0.15 - WALL_H*0.5}
                          x2={tcx + (rBR.x - tcx)*0.85} y2={rBR.y - WALL_H*0.5}
                          stroke={theme.color} strokeWidth={0.5} strokeDasharray="8 6" opacity={0.15} />
                    {/* Wall outline edges */}
                    <line x1={tcx} y1={tcy} x2={rBR.x} y2={rBR.y} stroke={theme.color} strokeWidth={1.2} opacity={0.5} />
                    <line x1={rBR.x} y1={rBR.y} x2={rBR.x} y2={rBR.y - WALL_H} stroke={theme.color} strokeWidth={1.2} opacity={0.4} />
                    <line x1={apex.x} y1={apex.y} x2={rBR.x} y2={rBR.y - WALL_H} stroke={theme.color} strokeWidth={1} opacity={0.4} />
                    {/* ── RIGHT WALL TOP SURFACE (horizontal cap showing thickness) ── */}
                    {/* Goes from the wall top edge inward toward viewer (left-diagonal direction) */}
                    <polygon
                      points={`${apex.x},${apex.y} ${rBR.x},${rBR.y - WALL_H} ${rBR.x + rFX},${rBR.y - WALL_H + rFY} ${apex.x + rFX},${apex.y + rFY}`}
                      fill="rgba(255,255,255,0.18)"
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Right wall outer side face — shows wall thickness at the outer edge */}
                    <polygon
                      points={`${rBR.x},${rBR.y - WALL_H} ${rBR.x},${rBR.y} ${rBR.x + rFX},${rBR.y + rFY} ${rBR.x + rFX},${rBR.y - WALL_H + rFY}`}
                      fill="rgba(0,0,0,0.45)"
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Top cap edge highlight */}
                    <line x1={apex.x + rFX} y1={apex.y + rFY} x2={rBR.x + rFX} y2={rBR.y - WALL_H + rFY} stroke={theme.color} strokeWidth={0.8} opacity={0.3} />
                    {isWallPlacing && <polygon points={`${tcx},${tcy} ${rBR.x},${rBR.y} ${rBR.x},${rBR.y - WALL_H} ${apex.x},${apex.y}`} fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.5)" strokeWidth={2} style={{ pointerEvents: "none" }} />}

                    {/* Right wall portals */}
                    {portals.filter(p => p.wall_side === "right").map(renderPortal)}

                    {/* ── LEFT WALL ── */}
                    {/* Main wall face */}
                    <polygon
                      points={`${tcx},${tcy} ${lBL.x},${lBL.y} ${lBL.x},${lBL.y - WALL_H} ${apex.x},${apex.y}`}
                      fill={theme.wallB}
                      onClick={e => handleWallClick(e, "left")}
                      onContextMenu={e => handleWallContextMenu(e, "left")}
                      style={{ cursor: isWallPlacing ? "crosshair" : "default" }}
                    />
                    {/* Panel division lines */}
                    {[0.33, 0.66].map(frac => (
                      <line key={`lp-${frac}`}
                        x1={tcx} y1={tcy - frac * WALL_H}
                        x2={lBL.x} y2={lBL.y - frac * WALL_H}
                        stroke={theme.color} strokeWidth={0.8} opacity={0.14}
                      />
                    ))}
                    {/* Baseboard */}
                    <polygon points={`${tcx},${tcy} ${lBL.x},${lBL.y} ${lBL.x},${lBL.y - 14} ${tcx},${tcy - 14}`} fill="rgba(0,0,0,0.35)" />
                    <line x1={tcx} y1={tcy - 14} x2={lBL.x} y2={lBL.y - 14} stroke={theme.color} strokeWidth={0.8} opacity={0.3} />
                    {/* Sci-fi circuit accent */}
                    <line x1={tcx - (tcx - lBL.x)*0.15} y1={tcy + (lBL.y - tcy)*0.15 - WALL_H*0.5}
                          x2={tcx - (tcx - lBL.x)*0.85} y2={lBL.y - WALL_H*0.5}
                          stroke={theme.color} strokeWidth={0.5} strokeDasharray="8 6" opacity={0.12} />
                    {/* Wall outline edges */}
                    <line x1={tcx} y1={tcy} x2={lBL.x} y2={lBL.y} stroke={theme.color} strokeWidth={1.2} opacity={0.4} />
                    <line x1={lBL.x} y1={lBL.y} x2={lBL.x} y2={lBL.y - WALL_H} stroke={theme.color} strokeWidth={1.2} opacity={0.35} />
                    <line x1={apex.x} y1={apex.y} x2={lBL.x} y2={lBL.y - WALL_H} stroke={theme.color} strokeWidth={1} opacity={0.35} />
                    {/* ── LEFT WALL TOP SURFACE (horizontal cap showing thickness) ── */}
                    <polygon
                      points={`${apex.x},${apex.y} ${lBL.x},${lBL.y - WALL_H} ${lBL.x + lFX},${lBL.y - WALL_H + lFY} ${apex.x + lFX},${apex.y + lFY}`}
                      fill="rgba(255,255,255,0.11)"
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Left wall outer side face */}
                    <polygon
                      points={`${lBL.x},${lBL.y - WALL_H} ${lBL.x},${lBL.y} ${lBL.x + lFX},${lBL.y + lFY} ${lBL.x + lFX},${lBL.y - WALL_H + lFY}`}
                      fill="rgba(0,0,0,0.45)"
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Top cap edge highlight */}
                    <line x1={apex.x + lFX} y1={apex.y + lFY} x2={lBL.x + lFX} y2={lBL.y - WALL_H + lFY} stroke={theme.color} strokeWidth={0.8} opacity={0.25} />
                    {/* ── CORNER top cap (small diamond at apex where two top surfaces meet) ── */}
                    <polygon
                      points={`${apex.x},${apex.y} ${apex.x + rFX},${apex.y + rFY} ${apex.x + rFX + lFX},${apex.y + rFY + lFY} ${apex.x + lFX},${apex.y + lFY}`}
                      fill="rgba(255,255,255,0.24)"
                      style={{ pointerEvents: "none" }}
                    />

                    {/* ── PORTALS (doors & windows) ── */}
                    {portals.filter(p => p.wall_side === "left").map(renderPortal)}

                    {/* ── CORNER ridge ── */}
                    <line x1={tcx} y1={tcy} x2={apex.x} y2={apex.y} stroke={theme.color} strokeWidth={2.5} opacity={0.7} />

                    {isWallPlacing && <polygon points={`${tcx},${tcy} ${lBL.x},${lBL.y} ${lBL.x},${lBL.y - WALL_H} ${apex.x},${apex.y}`} fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.5)" strokeWidth={2} style={{ pointerEvents: "none" }} />}

                    {/* Wall-mounted items */}
                    {wallItems.map(renderWallItemSvg)}
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
                const isDartZone = dartGames.some(g => {
                  if (g.status !== "active") return false;
                  const board = items.find(i => i.id === g.item_id);
                  if (!board) return false;
                  const zGx = board.wall_side === "left" ? 4 : Math.round((board.wall_pos ?? 0.5) * (roomCols - 1));
                  const zGy = board.wall_side === "left" ? Math.round((board.wall_pos ?? 0.5) * (roomRows - 1)) : 4;
                  return gx === zGx && gy === zGy;
                });
                const isBotTarget = !!movingBotId && !cellBot;
                const isFloorPlacing = !!placingItem && !isWallItemType(placingItem.item.item_type);
                const isPlaceTarget = isFloorPlacing && isHov && !hasUser && !cellBot;
                const isLocked = lockedTiles.has(cellKey);

                const baseFill = (() => {
                  switch (activeFloorPattern) {
                    case "checkerboard": return (Math.floor(gx / 2) + Math.floor(gy / 2)) % 2 === 0 ? theme.even : theme.odd;
                    case "diamond":      return (gx % 4 === 0 && gy % 4 === 0) || (gx % 4 === 2 && gy % 4 === 2) ? theme.highlight : (gx + gy) % 2 === 0 ? theme.even : theme.odd;
                    case "uniform":      return theme.even;
                    case "grid":         return theme.even;
                    default:             return (gx + gy) % 2 === 0 ? theme.even : theme.odd;
                  }
                })();
                const gridStroke = activeFloorPattern === "grid" ? theme.color + "55" : theme.color + "32";
                const tileFill = isMyTile ? theme.highlight : isPlaceTarget ? "#1a2e48" : isBotTarget && isHov ? "#1a3020" : isHov ? theme.highlight + "80" : baseFill;
                const tileStroke = isMyTile ? myColor : isPlaceTarget ? "#6366f1" : isBotTarget && isHov ? "#22c55e" : isHov ? theme.color + "90" : gridStroke;

                // Tile front-left and front-right edge "side" panels — 3D raised look (Habbo-style)
                const D = 4; // side depth in pixels
                const leftSidePts  = `${x - TW/2},${y} ${x},${y + TH/2} ${x},${y + TH/2 + D} ${x - TW/2},${y + D}`;
                const rightSidePts = `${x},${y + TH/2} ${x + TW/2},${y} ${x + TW/2},${y + D} ${x},${y + TH/2 + D}`;

                return (
                  <g key={cellKey} style={{ pointerEvents: "none" }}>
                    {/* Front edge panels for depth illusion */}
                    <polygon points={leftSidePts}  fill="rgba(0,0,0,0.42)" />
                    <polygon points={rightSidePts} fill="rgba(0,0,0,0.28)" />
                    <polygon points={tilePts(x, y)} fill={tileFill} stroke={tileStroke} strokeWidth={isMyTile || isPlaceTarget ? 1.5 : 1} />
                    {isHov && !hasUser && !cellBot && !movingBotId && !isFloorPlacing && <polygon points={tilePts(x, y)} fill="rgba(80,140,255,0.08)" stroke="rgba(80,140,255,0.25)" strokeWidth={0.8} />}
                    {/* Locked tile overlay */}
                    {isLocked && (
                      <polygon points={tilePts(x, y)}
                        fill={isAdmin ? "rgba(239,68,68,0.13)" : "rgba(160,160,160,0.09)"}
                        stroke={isAdmin ? "rgba(239,68,68,0.35)" : "rgba(160,160,160,0.18)"}
                        strokeWidth={0.8} />
                    )}
                    {isLocked && isAdmin && (
                      <text x={x} y={y + 3} textAnchor="middle" fontSize={7} fill="rgba(239,68,68,0.7)" style={{ pointerEvents: "none", userSelect: "none" }}>🔒</text>
                    )}

                    {/* Dart throwing zone highlight */}
                    {isDartZone && (
                      <polygon points={tilePts(x, y)} fill="rgba(251,191,36,0.22)" stroke="#fbbf24" strokeWidth={1.5}>
                        <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
                      </polygon>
                    )}
                    {isDartZone && (
                      <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fill="#fbbf24" style={{ pointerEvents: "none" }}>🎯</text>
                    )}

                    {/* Casino Las Vegas felt table surface */}
                    {activeRoomType === "casino" && (() => {
                      const rcx = rouletteGx ?? Math.floor(roomCols / 2);
                      const rcy = rouletteGy ?? Math.floor(roomRows / 2);
                      const dx = gx - rcx, dy = gy - rcy;
                      if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) {
                        const isCenter = dx === 0 && dy === 0;
                        const isEdge = Math.abs(dx) === 2 || Math.abs(dy) === 2;
                        // Felt color: center=dark green, ring=casino green, border=deep gold
                        const feltFill = isEdge ? "#3b1800" : isCenter ? "#052e1c" : "#064e3b";
                        const feltStroke = isEdge ? "#92400e" : "#059669";
                        const pts = tilePts(x, y);
                        return (
                          <>
                            <polygon points={pts} fill={feltFill} stroke={feltStroke} strokeWidth={isEdge ? 1.5 : 1} />
                            {/* Gold border decorative lines on felt */}
                            {!isEdge && (
                              <polygon points={pts}
                                fill="none"
                                stroke={isCenter ? "rgba(251,191,36,0.25)" : "rgba(251,191,36,0.12)"}
                                strokeWidth={isCenter ? 1.2 : 0.7}
                                strokeDasharray={isCenter ? "none" : "3 3"}
                              />
                            )}
                          </>
                        );
                      }
                      return null;
                    })()}

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

              {/* ── Roulette table & wheel (casino rooms only) ── */}
              {activeRoomType === "casino" && (() => {
                const tcx = rouletteGx ?? Math.floor(roomCols / 2);
                const tcy = rouletteGy ?? Math.floor(roomRows / 2);
                const { x: cx, y: cy } = isoCenter(tcx, tcy, svgW);
                const scale = rouletteScale ?? 1.0;
                const rx = TW * 1.1 * scale;  // horizontal radius
                const ry = rx * (TH / TW) * 0.85; // isometric compression
                const numSlots = 37;

                // Roulette wheel segments
                const segments = ROULETTE_WHEEL_ORDER.map((num, i) => {
                  const a1 = ((i - 0.5) / numSlots) * 2 * Math.PI - Math.PI / 2;
                  const a2 = ((i + 0.5) / numSlots) * 2 * Math.PI - Math.PI / 2;
                  const x1 = cx + rx * Math.cos(a1);
                  const y1 = (cy - TH * 0.3) + ry * Math.sin(a1);
                  const x2 = cx + rx * Math.cos(a2);
                  const y2 = (cy - TH * 0.3) + ry * Math.sin(a2);
                  const fill = rouletteColor(num) === "green" ? "#065f46" : rouletteColor(num) === "red" ? "#7f1d1d" : "#111827";
                  const stroke = rouletteColor(num) === "green" ? "#10b981" : rouletteColor(num) === "red" ? "#ef4444" : "#374151";
                  return (
                    <path key={i}
                      d={`M ${cx.toFixed(1)} ${(cy - TH * 0.3).toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rx} ${ry} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={0.5}
                    />
                  );
                });

                // Ball position — subtract PI/2 so angle 0 = top, matching segment layout
                const ballOrbitRx = rx * 0.82;
                const ballOrbitRy = ry * 0.82;
                const ballAng = (rouletteWheelAngle * Math.PI) / 180 - Math.PI / 2;
                const ballX = cx + ballOrbitRx * Math.cos(ballAng);
                const ballY = (cy - TH * 0.3) + ballOrbitRy * Math.sin(ballAng);

                // Number text on result
                const resultNum = rouletteRound?.result;
                const resultColor = resultNum !== undefined ? rouletteColor(resultNum) : "black";

                // Arrow pointer at result position (top of wheel, pointing inward)
                const arrowAng = roulettePhase === "finished" && resultNum !== undefined
                  ? (rouletteWheelAngleForResult(resultNum) * Math.PI) / 180 - Math.PI / 2
                  : null;
                const arrowTipRx = rx + 5;
                const arrowTipRy = ry + 2.5;
                const arrowTip = arrowAng !== null ? {
                  x: cx + arrowTipRx * Math.cos(arrowAng),
                  y: (cy - TH * 0.3) + arrowTipRy * Math.sin(arrowAng),
                } : null;
                const arrowBase1 = arrowAng !== null ? {
                  x: cx + (arrowTipRx + 10) * Math.cos(arrowAng + 0.18),
                  y: (cy - TH * 0.3) + (arrowTipRy + 5) * Math.sin(arrowAng + 0.18),
                } : null;
                const arrowBase2 = arrowAng !== null ? {
                  x: cx + (arrowTipRx + 10) * Math.cos(arrowAng - 0.18),
                  y: (cy - TH * 0.3) + (arrowTipRy + 5) * Math.sin(arrowAng - 0.18),
                } : null;

                return (
                  <g
                    style={{ cursor: "pointer" }}
                    onClick={() => setRightPanel(p => p === "roulette" ? p : "roulette")}
                  >
                    {/* Outer gold ring / bezel */}
                    <ellipse cx={cx} cy={cy - TH * 0.3} rx={rx + 9} ry={ry + 4.5} fill="#78350f" stroke="#fbbf24" strokeWidth={1.5} />
                    <ellipse cx={cx} cy={cy - TH * 0.3} rx={rx + 6} ry={ry + 3} fill="#111827" stroke="#374151" strokeWidth={1.5} />
                    {/* Segments */}
                    {segments}
                    {/* Inner hub */}
                    <ellipse cx={cx} cy={cy - TH * 0.3} rx={rx * 0.22} ry={ry * 0.22} fill="#1f2937" stroke="#4b5563" strokeWidth={1} />
                    {/* Center cross */}
                    <line x1={cx - rx * 0.12} y1={cy - TH * 0.3} x2={cx + rx * 0.12} y2={cy - TH * 0.3} stroke="#6b7280" strokeWidth={0.8} />
                    <line x1={cx} y1={cy - TH * 0.3 - ry * 0.12} x2={cx} y2={cy - TH * 0.3 + ry * 0.12} stroke="#6b7280" strokeWidth={0.8} />
                    {/* Dividers between segments */}
                    {ROULETTE_WHEEL_ORDER.map((_, i) => {
                      const a = (i / numSlots) * 2 * Math.PI - Math.PI / 2;
                      const ox = cx + rx * Math.cos(a);
                      const oy = (cy - TH * 0.3) + ry * Math.sin(a);
                      return <line key={i} x1={cx} y1={cy - TH * 0.3} x2={ox} y2={oy} stroke="rgba(0,0,0,0.6)" strokeWidth={0.4} />;
                    })}
                    {/* Segment numbers */}
                    {ROULETTE_WHEEL_ORDER.map((num, i) => {
                      const midA = (i / numSlots) * 2 * Math.PI - Math.PI / 2;
                      const tr = rx * 0.70;
                      const tRy = ry * 0.70;
                      const tx = cx + tr * Math.cos(midA);
                      const ty = (cy - TH * 0.3) + tRy * Math.sin(midA);
                      return (
                        <text key={`n-${i}`} x={tx} y={ty + 2} textAnchor="middle" fontSize={5.5 * scale} fontWeight="900"
                          fill="white" fontFamily="system-ui,sans-serif" opacity={0.92}>
                          {num}
                        </text>
                      );
                    })}
                    {/* Ball */}
                    {(roulettePhase === "spinning" || roulettePhase === "finished") && (
                      <circle cx={ballX} cy={ballY} r={4 * scale} fill="white" stroke="#e5e7eb" strokeWidth={0.8} />
                    )}
                    {/* Arrow pointer at result */}
                    {roulettePhase === "finished" && arrowTip && arrowBase1 && arrowBase2 && (
                      <polygon
                        points={`${arrowTip.x.toFixed(1)},${arrowTip.y.toFixed(1)} ${arrowBase1.x.toFixed(1)},${arrowBase1.y.toFixed(1)} ${arrowBase2.x.toFixed(1)},${arrowBase2.y.toFixed(1)}`}
                        fill="#fbbf24" stroke="#92400e" strokeWidth={1}
                        style={{ filter: "drop-shadow(0 0 3px rgba(251,191,36,0.8))" }}
                      />
                    )}
                    {/* Result or phase label */}
                    {roulettePhase === "finished" && resultNum !== undefined && (
                      <>
                        <ellipse cx={cx} cy={cy - TH * 0.3} rx={rx * 0.18} ry={ry * 0.18}
                          fill={resultColor === "red" ? "#ef4444" : resultColor === "green" ? "#10b981" : "#111827"} />
                        <text x={cx} y={cy - TH * 0.3 + 4}
                          textAnchor="middle" fontSize={11} fontWeight="900"
                          fill="white" fontFamily="system-ui,sans-serif"
                          stroke="rgba(0,0,0,0.8)" strokeWidth={2} paintOrder="stroke">
                          {resultNum}
                        </text>
                      </>
                    )}
                    {roulettePhase === "betting" && (
                      <text x={cx} y={cy - TH * 0.3 + 4}
                        textAnchor="middle" fontSize={8} fontWeight="700"
                        fill="#6b7280" fontFamily="system-ui,sans-serif">
                        {rouletteTimeLeft}s
                      </text>
                    )}
                    {roulettePhase === "spinning" && (
                      <text x={cx} y={cy - TH * 0.3 + 4}
                        textAnchor="middle" fontSize={7} fontWeight="700"
                        fill="#fbbf24" fontFamily="system-ui,sans-serif"
                        stroke="rgba(0,0,0,0.8)" strokeWidth={1.5} paintOrder="stroke">
                        🎰
                      </text>
                    )}
                    {/* Admin move mode indicator */}
                    {rouletteMoveMode && isAdmin && (
                      <ellipse cx={cx} cy={cy - TH * 0.3} rx={rx + 12} ry={ry + 6}
                        fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="6 3"
                        style={{ animation: "none", opacity: 0.8 }}
                      />
                    )}
                  </g>
                );
              })()}

              {/* ── Depth-sorted sprite layer: items + bots + users ── */}
              {(() => {
                type Sprite =
                  | { kind: "item"; item: RoomItem; gx: number; gy: number }
                  | { kind: "bot";  bot: RoomBot;   gx: number; gy: number }
                  | { kind: "user"; user: PresenceUser; gx: number; gy: number }
                  | { kind: "ghost"; item: RoomItem; rotation: number; gx: number; gy: number };
                const sprites: Sprite[] = [];
                // Exclude item being moved so it disappears from its old spot
                items.filter(i => i.gx !== null && i.gy !== null && !i.wall_side && i.id !== movingFloorItemId).forEach(i => sprites.push({ kind: "item", item: i, gx: i.gx!, gy: i.gy! }));
                // Ghost preview — show on hovered tile when placing/moving a floor item
                if (placingItem && !isWallItemType(placingItem.item.item_type) && hovered) {
                  const parts = hovered.split(",");
                  const hgx = parseInt(parts[0]), hgy = parseInt(parts[1]);
                  if (!isNaN(hgx) && !isNaN(hgy)) sprites.push({ kind: "ghost", item: placingItem.item, rotation: placingItem.rotation, gx: hgx, gy: hgy });
                }
                bots.filter(b => b.gx >= 0 && b.gx < roomCols && b.gy >= 0 && b.gy < roomRows).forEach(b => sprites.push({ kind: "bot", bot: b, gx: b.gx, gy: b.gy }));
                // Add current user from local state (excluded from presence users map)
                sprites.push({ kind: "user", user: { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: myPos.gx, gy: myPos.gy, mood: myMood, outfit: myOutfit }, gx: myPos.gx, gy: myPos.gy });
                Array.from(users.values()).filter(u => u.gx >= 0 && u.gx < roomCols && u.gy >= 0 && u.gy < roomRows).forEach(u => sprites.push({ kind: "user", user: u, gx: u.gx, gy: u.gy }));
                sprites.sort((a, b) => {
                  const itemScale = (s: Sprite) => s.kind === "item" || s.kind === "ghost" ? 0.2 * Math.min((s as { item: RoomItem }).item?.item_scale ?? 1, 1) : 0;
                  const da = a.gx + a.gy + (a.kind === "user" ? 0.6 : a.kind === "bot" ? 0.4 : a.kind === "ghost" ? 0.3 : itemScale(a));
                  const db = b.gx + b.gy + (b.kind === "user" ? 0.6 : b.kind === "bot" ? 0.4 : b.kind === "ghost" ? 0.3 : itemScale(b));
                  return da - db;
                });
                return sprites.map(s => {
                  const { x, y } = isoCenter(s.gx, s.gy, svgW);
                  const ax = x; const ay = y - AR_S;
                  if (s.kind === "ghost") {
                    const rot = s.rotation * 90;
                    return (
                      <g key="ghost-preview" style={{ pointerEvents: "none" }}>
                        {/* Pulsing highlight on the target tile */}
                        <polygon points={tilePts(x, y)} fill="rgba(80,160,255,0.18)" stroke="rgba(80,160,255,0.7)" strokeWidth={1.5} strokeDasharray="4 2" />
                        {/* Transparent ghost item */}
                        <g transform={`translate(${x}, ${y - TH / 4}) scale(${0.85 * (s.item.item_scale ?? 1)}) rotate(${rot})`} opacity={0.55}>
                          <ItemSVG type={s.item.item_type} />
                        </g>
                      </g>
                    );
                  }
                  if (s.kind === "item") {
                    const rot = (s.item.rotation ?? 0) * 90;
                    return (
                      <g key={`item-${s.item.id}`} onContextMenu={e => handleRightClick(e, null, s.item, null)}>
                        <g transform={`translate(${x}, ${y - TH / 4}) scale(${0.85 * (s.item.item_scale ?? 1)}) rotate(${rot})`}>
                          <ItemSVG type={s.item.item_type} />
                        </g>
                      </g>
                    );
                  }
                  if (s.kind === "bot") {
                    const cellBot = s.bot;
                    return (
                      <g key={`bot-${cellBot.id}`} onContextMenu={e => handleRightClick(e, null, null, cellBot)}>
                        <ellipse cx={ax} cy={y+16} rx={16} ry={4} fill="rgba(0,0,0,0.3)" />
                        <g transform={`translate(${ax}, ${ay}) scale(${AVG_SCALE})`}>
                          <PersonAvatar color={cellBot.color} glow={false} mood="happy" />
                        </g>
                        <text x={ax} y={y + 9} textAnchor="middle" fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="700" stroke="rgba(0,0,0,0.9)" strokeWidth={3} fill="rgba(0,0,0,0.9)">{cellBot.name}</text>
                        <text x={ax} y={y + 9} textAnchor="middle" fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="700" fill="#94a3b8">{cellBot.name}</text>
                        <circle cx={ax + 15} cy={ay - AR_S - 8} r={5} fill="#1e293b" stroke="#475569" strokeWidth={0.8} />
                        <text x={ax + 15} y={ay - AR_S - 5.5} textAnchor="middle" fontSize={6} fill="#94a3b8">⚙</text>
                        {cellBot.gives_clothing_id && <text x={ax} y={y + TH / 4 + 8} textAnchor="middle" fontSize={8}>🎁</text>}
                        {/* Bot bubble rendered in HTML overlay */}
                      </g>
                    );
                  }
                  // user
                  const user = s.user;
                  const isMe = user.user_id === currentProfile.id;
                  const userBubbles = bubbles.get(user.user_id) ?? [];
                  const isTyping = !isMe && typingUsers.has(user.user_id);
                  const userTanLevel = isMe ? tanLevel : (user.tan_level ?? 0);
                  return (
                    <g key={`user-${user.user_id}`}
                      onClick={() => handleTileClick(user.gx, user.gy)}
                      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); handleRightClick(e, user, null, null); }}>
                      <g style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform 0.38s cubic-bezier(0.22,1,0.36,1)" }}>
                        {/* Aura glow — centered around avatar body */}
                        {(() => { const ac = isMe ? auraColor : (user.aura_color ?? null); return ac ? (
                          <g style={{ pointerEvents: "none" }}>
                            {/* Avatar body bounds (world space):
                                top  = -AR_S + (-30 * AVG_SCALE) ≈ -70
                                bot  = -AR_S + ( 20 * AVG_SCALE) ≈   0
                                center y = -35 = -(AR_S + AR*AVG_SCALE*0.25)
                                half-width ≈ 14*AVG_SCALE ≈ 20  */}
                            {/* Outer pulsing ring — fits body silhouette */}
                            <ellipse cx={0} cy={-(AR_S + AR * AVG_SCALE * 0.25)}
                              rx={AR * AVG_SCALE * 0.96} ry={AR * AVG_SCALE * 1.54}
                              fill="none" stroke={ac} strokeWidth={3} opacity={0.65}>
                              <animate attributeName="opacity" values="0.65;0.2;0.65" dur="2.2s" repeatCount="indefinite" />
                              <animate attributeName="rx" values={`${AR * AVG_SCALE * 0.96};${AR * AVG_SCALE * 1.08};${AR * AVG_SCALE * 0.96}`} dur="2.2s" repeatCount="indefinite" />
                              <animate attributeName="ry" values={`${AR * AVG_SCALE * 1.54};${AR * AVG_SCALE * 1.66};${AR * AVG_SCALE * 1.54}`} dur="2.2s" repeatCount="indefinite" />
                            </ellipse>
                            {/* Inner soft fill */}
                            <ellipse cx={0} cy={-(AR_S + AR * AVG_SCALE * 0.25)}
                              rx={AR * AVG_SCALE * 0.72} ry={AR * AVG_SCALE * 1.2}
                              fill={ac} opacity={0.13}>
                              <animate attributeName="opacity" values="0.13;0.04;0.13" dur="2.2s" repeatCount="indefinite" />
                            </ellipse>
                            {/* Floor glow */}
                            <ellipse cx={0} cy={14} rx={20} ry={5.5} fill={ac} opacity={0.3} />
                          </g>
                        ) : null; })()}
                        <ellipse cx={0} cy={16} rx={18} ry={5} fill="rgba(0,0,0,0.45)" />
                        <g transform={`translate(0,${-AR_S}) scale(${AVG_SCALE})`}>
                          <PersonAvatar color={user.color} glow={false} mood={user.mood} tanLevel={userTanLevel} />
                          {(() => { const outfit = isMe ? myOutfit : (user.outfit ?? {}); return Object.keys(outfit).length > 0 ? <ClothingOverlay outfit={outfit} catalog={clothingCatalog} /> : null; })()}
                        </g>
                        <text x={0} y={9} textAnchor="middle" fontSize={10} fontFamily="system-ui,sans-serif" fontWeight="700" stroke="rgba(0,0,0,0.9)" strokeWidth={3} fill="rgba(0,0,0,0.9)">{user.display_name}</text>
                        <text x={0} y={9} textAnchor="middle" fontSize={10} fontFamily="system-ui,sans-serif" fontWeight="700" fill={isMe ? (nameColor ?? "white") : (user.name_color ?? "white")}>{user.display_name}</text>
                        {/* Muted indicator */}
                        {mutedUsers.has(user.user_id) && (
                          <g>
                            <circle cx={18} cy={-AR_S + 4} r={8} fill="#ef4444" opacity={0.93} />
                            <text x={18} y={-AR_S + 8.5} textAnchor="middle" fontSize={9} fontFamily="system-ui,sans-serif">🔇</text>
                          </g>
                        )}
                        {/* ZZZ idle effect — shown after 10 min of inactivity (move/chat) */}
                        {(() => {
                          const lastAct = isMe
                            ? lastActivityRef.current
                            : (userLastActivityRef.current.get(user.user_id) ?? null);
                          if (lastAct === null) return null; // no data yet for remote user
                          if (Date.now() - lastAct < 10 * 60 * 1000) return null;
                          const ZS = [
                            { sz: 7,  dx: 12, baseY: -AR_S * 2.1,      delay: "0s"   },
                            { sz: 9,  dx: 20, baseY: -AR_S * 2.1 - 10, delay: "0.8s" },
                            { sz: 12, dx: 29, baseY: -AR_S * 2.1 - 22, delay: "1.6s" },
                          ];
                          return (
                            <g style={{ pointerEvents: "none" }}>
                              {ZS.map(({ sz, dx, baseY, delay }, i) => (
                                <text key={i} x={dx} y={baseY} textAnchor="middle" fontSize={sz} fontWeight="900"
                                  fill="#fbbf24" fontFamily="system-ui,sans-serif"
                                  stroke="rgba(0,0,0,0.75)" strokeWidth={1.5} paintOrder="stroke" opacity={0}>
                                  <animate attributeName="opacity" values="0;1;0" dur="2.4s" begin={delay} repeatCount="indefinite" />
                                  <animate attributeName="y" from={`${baseY}`} to={`${baseY - 16}`} dur="2.4s" begin={delay} repeatCount="indefinite" />
                                  Z
                                </text>
                              ))}
                            </g>
                          );
                        })()}
                        {/* Bubbles are rendered in the HTML overlay for zoom-independence */}
                        {/* Roulette win effect — +amount floating above avatar */}
                        {(() => {
                          const winAmt = isMe
                            ? (rouletteLastWin !== null ? rouletteLastWin : null)
                            : (rouletteWinEffects.get(user.user_id) ?? null);
                          if (winAmt === null) return null;
                          return (
                            <g style={{ pointerEvents: "none" }}>
                              {/* Coin burst rings */}
                              {([["#10b981", 0], ["#34d399", 0.15], ["#6ee7b7", 0.3]] as [string, number][]).map(([rc, delay], i) => (
                                <circle key={i} cx={0} cy={-AR_S * 0.3} fill="none" stroke={rc} strokeWidth={1.6 - i * 0.3}>
                                  <animate attributeName="r" from="4" to="52" dur="1s" begin={`${delay}s`} repeatCount="indefinite" />
                                  <animate attributeName="opacity" from="0.8" to="0" dur="1s" begin={`${delay}s`} repeatCount="indefinite" />
                                </circle>
                              ))}
                              {/* +amount text floating upward */}
                              <text x={0} y={-AR_S - 18}
                                textAnchor="middle" fontSize={14} fontFamily="system-ui,sans-serif" fontWeight="900"
                                fill="#10b981" stroke="rgba(0,0,0,0.9)" strokeWidth={3} paintOrder="stroke"
                                style={{ animation: "svgLevelUpText 3s ease-out forwards" }}>
                                +{winAmt} 🪙
                              </text>
                            </g>
                          );
                        })()}
                        {/* Dart throw effect — label floating above avatar */}
                        {(() => {
                          const dartLabel = isMe ? dartThrowEffects.get(currentProfile.id) : dartThrowEffects.get(user.user_id);
                          if (!dartLabel) return null;
                          return (
                            <g style={{ pointerEvents: "none" }}>
                              <text x={0} y={-AR_S - 22}
                                textAnchor="middle" fontSize={12} fontFamily="system-ui,sans-serif" fontWeight="900"
                                fill="#fbbf24" stroke="rgba(0,0,0,0.9)" strokeWidth={3} paintOrder="stroke"
                                style={{ animation: "svgLevelUpText 3s ease-out forwards" }}>
                                🎯 {dartLabel}
                              </text>
                            </g>
                          );
                        })()}
                        {/* Level-up ring animation — shown for self and others */}
                        {(isMe ? showLevelUp : otherLevelUps.get(user.user_id) ?? null) !== null && (() => {
                          const lvNum = isMe ? showLevelUp! : otherLevelUps.get(user.user_id)!;
                          return (
                            <g>
                              {([["#fbbf24", 0], ["#c4b5fd", 0.3], ["#8b5cf6", 0.6]] as [string, number][]).map(([ringColor, delay], i) => (
                                <circle key={i} cx={0} cy={0} fill="none" stroke={ringColor} strokeWidth={2.2 - i * 0.4}>
                                  <animate attributeName="r" from="8" to="70" dur="1.4s" begin={`${delay}s`} repeatCount="indefinite" />
                                  <animate attributeName="opacity" from="0.9" to="0" dur="1.4s" begin={`${delay}s`} repeatCount="indefinite" />
                                </circle>
                              ))}
                              <text x={0} y={-AR_S - 20} textAnchor="middle" fontSize={isMe ? 12 : 10} fontFamily="system-ui,sans-serif" fontWeight="900" fill="#fbbf24" stroke="rgba(0,0,0,0.95)" strokeWidth={3} paintOrder="stroke" style={{ animation: "svgLevelUpText 3s ease-out forwards" }}>
                                ★ LEVEL {lvNum} ★
                              </text>
                            </g>
                          );
                        })()}
                      </g>
                    </g>
                  );
                });
              })()}

              {/* ── Click-cap layer: transparent polygons above all sprites so every tile is always clickable ── */}
              {sortedTiles.map(({ gx, gy }) => {
                const { x, y } = isoCenter(gx, gy, svgW);
                const cellKey = `${gx},${gy}`;
                const cellUser = usersByCell.get(cellKey);
                const cellBot = botsByCell.get(cellKey);
                const cellItem = itemsByCell.get(cellKey);
                const isFloorPlacing = !!placingItem && !isWallItemType(placingItem.item.item_type);
                const isOccupiedByOther = !!cellUser && cellUser.user_id !== currentProfile.id;
                return (
                  <polygon
                    key={`cap-${cellKey}`}
                    points={tilePts(x, y)}
                    fill="transparent"
                    stroke="none"
                    onClick={() => handleTileClick(gx, gy)}
                    onContextMenu={e => {
                      e.preventDefault();
                      if (cellUser) handleRightClick(e, cellUser, null, null);
                      else handleRightClick(e, null, cellItem ?? null, cellBot ?? null, gx, gy);
                    }}
                    onMouseEnter={() => setHovered(cellKey)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: isFloorPlacing ? "crosshair" : movingBotId ? "crosshair" : isOccupiedByOther || cellBot ? "default" : "pointer" }}
                  />
                );
              })}
            </svg>

            {/* ── HTML Bubble Overlay — fixed pixel size regardless of SVG zoom ── */}
            {(() => {
              // Convert SVG coordinate to container-relative pixels,
              // accounting for xMidYMid meet letterboxing in the SVG element.
              const toP = (svgX: number, svgY: number) => ({
                left: `${(vbParams.offsetX + (svgX - vbParams.vbX) / vbParams.vbW * vbParams.renderW).toFixed(1)}px`,
                top:  `${(vbParams.offsetY + (svgY - vbParams.vbY) / vbParams.vbH * vbParams.renderH).toFixed(1)}px`,
              });
              const BUBBLE_ANCHOR_Y = -AR_S * 2.8; // above head in SVG units

              const renderBubble = (key: string, svgX: number, svgY: number, messages: { text: string; id: number }[], bc: string, isDraft?: boolean, isTypingDots?: boolean) => {
                const pos = toP(svgX, svgY + BUBBLE_ANCHOR_Y);
                const textColor = bc === "#ffffff" || bc === "#fde68a" || bc === "#86efac" || bc === "#93c5fd" || bc === "#fca5a5" ? "#111827" : "#ffffff";
                const tailColor = bc;
                return (
                  <div key={key} style={{ position: "absolute", ...pos, transform: "translate(-50%, -100%)", transition: "left 0.38s cubic-bezier(0.22,1,0.36,1), top 0.38s cubic-bezier(0.22,1,0.36,1)", pointerEvents: "none", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    {messages.map((m, i) => {
                      const isNewest = i === messages.length - 1;
                      const opacity = i === 0 && messages.length === 3 ? 0.55 : i === 1 && messages.length >= 2 ? 0.78 : 1;
                      return (
                        <div key={m.id} style={{ opacity, background: bc, border: "1.5px solid rgba(0,0,0,0.13)", borderRadius: 9, padding: "4px 10px", fontSize: 12, fontFamily: "system-ui,sans-serif", fontWeight: 600, color: textColor, whiteSpace: "pre-wrap", maxWidth: 180, lineHeight: 1.35, boxShadow: "0 2px 10px rgba(0,0,0,0.22)", position: "relative" }}>
                          {isTypingDots && isNewest ? <span style={{ letterSpacing: 3 }}>{["●  ○  ○", "○  ●  ○", "○  ○  ●"][typingFrame % 3]}</span> : m.text}
                          {isNewest && (
                            <div style={{ position: "absolute", left: "50%", bottom: -6, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `6px solid ${tailColor}` }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              };

              const allBubbles: React.ReactNode[] = [];

              // Current user — draft or sent messages
              const { x: mx, y: my } = isoCenter(myPos.gx, myPos.gy, svgW);
              const myBubbleList = bubbles.get(currentProfile.id) ?? [];
              if (draft) {
                allBubbles.push(renderBubble("me-draft", mx, my, [{ text: draft + "…", id: -1 }], bubbleColor ?? "#ffffff", true));
              } else if (myBubbleList.length > 0) {
                const visible = myBubbleList.slice(-3);
                allBubbles.push(renderBubble("me", mx, my, visible, bubbleColor ?? "#ffffff"));
              }

              // Other users
              Array.from(users.values()).forEach(u => {
                const { x: ux, y: uy } = isoCenter(u.gx, u.gy, svgW);
                const ub = bubbles.get(u.user_id) ?? [];
                const isTyp = typingUsers.has(u.user_id);
                const bc = u.bubble_color ?? "#ffffff";
                if (isTyp && ub.length === 0) {
                  allBubbles.push(renderBubble(`typing-${u.user_id}`, ux, uy, [{ text: "…", id: -1 }], bc, false, true));
                } else if (ub.length > 0) {
                  const visible = ub.slice(-3);
                  allBubbles.push(renderBubble(u.user_id, ux, uy, visible, bc));
                }
              });

              // Bots
              bots.forEach(bot => {
                if (!bot.message) return;
                const { x: bx, y: by } = isoCenter(bot.gx, bot.gy, svgW);
                const msgs = bot.message.split("\n").map((s: string) => s.trim()).filter(Boolean);
                const msg = (msgs.length > 0 ? msgs[botMsgTick % msgs.length] : bot.message).replace(/\{navn\}/gi, currentProfile.display_name);
                allBubbles.push(renderBubble(`bot-${bot.id}`, bx, by, [{ text: msg, id: bot.id.charCodeAt(0) }], "#f1f5f9"));
              });

              return <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: "none", zIndex: 15 }}>{allBubbles}</div>;
            })()}

            {/* Level guide modal */}
            {showLevelGuide && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowLevelGuide(false)}>
                <div className="bg-[#0a1628] border border-white/[0.1] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.8)] w-[320px] max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between flex-shrink-0">
                    <div>
                      <p className="text-[15px] font-black text-white">Niveau-oversigt</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">Du er på niveau {level} · {xpInCurrentLevel(xp)}/{xpForNextLevel(xp) || "MAX"} XP</p>
                    </div>
                    <button onClick={() => setShowLevelGuide(false)} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-3 space-y-1">
                    {XP_LEVELS.map((cumXp, i) => {
                      const lv = i + 1;
                      const isCurrentLv = lv === level;
                      const isUnlocked = xp >= cumXp;
                      const xpNeededThisLv = i === 0 ? 0 : cumXp - XP_LEVELS[i - 1];
                      const nextCumXp = XP_LEVELS[i + 1];
                      const inLv = isCurrentLv ? xpInCurrentLevel(xp) : 0;
                      const pct = isCurrentLv && xpForNextLevel(xp) > 0 ? Math.min(100, inLv / xpForNextLevel(xp) * 100) : isUnlocked && !isCurrentLv ? 100 : 0;
                      return (
                        <div key={lv} className={`rounded-xl px-3 py-2.5 border transition-colors ${isCurrentLv ? "bg-violet-500/15 border-violet-500/40" : isUnlocked ? "bg-white/[0.03] border-white/[0.05]" : "bg-white/[0.01] border-white/[0.03] opacity-50"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[13px] font-black ${isCurrentLv ? "text-violet-300" : isUnlocked ? "text-slate-300" : "text-slate-600"}`}>LV {lv}</span>
                              {isCurrentLv && <span className="text-[9px] font-bold bg-violet-500/25 text-violet-300 px-1.5 py-0.5 rounded-full border border-violet-500/30">NU</span>}
                              {lv === XP_LEVELS.length && <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/20">MAX</span>}
                            </div>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {lv === 1 ? "Start" : `+${xpNeededThisLv.toLocaleString()} XP`}
                            </span>
                          </div>
                          {isCurrentLv && nextCumXp !== undefined && (
                            <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                          {lv > 1 && <p className="text-[10px] text-slate-600 mt-0.5">{cumXp.toLocaleString()} XP i alt</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Level-up overlay */}
            {showLevelUp !== null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="animate-level-up flex flex-col items-center gap-2">
                  <div className="text-[13px] font-black uppercase tracking-[0.3em] text-violet-400">Level Up!</div>
                  <div className="text-6xl font-black text-white" style={{ textShadow: "0 0 40px rgba(139,92,246,0.9), 0 0 80px rgba(139,92,246,0.5)" }}>{showLevelUp}</div>
                  <div className="text-[13px] font-semibold text-violet-300 opacity-80">Niveau {showLevelUp} opnået</div>
                </div>
              </div>
            )}

            {/* Achievement earned toast */}
            {achievementNotif && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.8)] animate-level-up"
                  style={{ background: achievementNotif.badge_color + "22", borderColor: achievementNotif.badge_color + "50", backdropFilter: "blur(16px)" }}>
                  <span className="text-3xl leading-none">{achievementNotif.badge_emoji}</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: achievementNotif.badge_color }}>Bedrift opnået!</p>
                    <p className="text-[14px] font-black text-white">{achievementNotif.name}</p>
                    <p className="text-[11px] text-slate-400">{achievementNotif.description}</p>
                    {(achievementNotif.reward_coins > 0 || achievementNotif.reward_xp > 0) && (
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: achievementNotif.badge_color }}>
                        +{achievementNotif.reward_coins > 0 ? `🪙 ${achievementNotif.reward_coins}` : ""}{achievementNotif.reward_coins > 0 && achievementNotif.reward_xp > 0 ? "  " : ""}{achievementNotif.reward_xp > 0 ? `⚡ ${achievementNotif.reward_xp} XP` : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Solarie tan status HUD */}
            {activeRoomType === "solarie" && (() => {
              const sessionMin = solarieEnteredRef.current ? (Date.now() - solarieEnteredRef.current) / 60000 : 0;
              const totalMin = solarieMinutesRef.current + sessionMin;
              const THRESHOLDS = [0, 15, 30, 60, 120];
              const nextThreshold = tanLevel < 4 ? THRESHOLDS[tanLevel + 1] : null;
              const minsLeft = nextThreshold !== null ? Math.max(0, nextThreshold - totalMin) : 0;
              const secsLeft = Math.ceil(minsLeft * 60);
              const displayMin = Math.floor(secsLeft / 60);
              const displaySec = secsLeft % 60;
              return (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-4 py-2 bg-amber-950/90 backdrop-blur-xl rounded-2xl border border-amber-500/25 shadow-[0_4px_24px_rgba(0,0,0,0.7),0_0_20px_rgba(245,158,11,0.08)]">
                  <span className="text-base">☀️</span>
                  {/* Level dots */}
                  <div className="flex gap-1">
                    {TAN_LEVELS.slice(1).map((t, i) => (
                      <div key={i + 1} className="w-2.5 h-2.5 rounded-full border border-amber-800/40 transition-all duration-500"
                        style={{ backgroundColor: (i + 1) <= tanLevel ? t!.color : "rgba(255,255,255,0.06)", boxShadow: (i + 1) <= tanLevel ? `0 0 6px ${t!.color}80` : "none" }} />
                    ))}
                  </div>
                  {/* Current level label */}
                  <span className="text-[13px] font-bold text-amber-300">
                    {tanLevel > 0 ? TAN_LEVELS[tanLevel]!.label : "Solarier…"}
                  </span>
                  {/* Countdown to next level */}
                  {tanLevel < 4 && (
                    <>
                      <div className="w-px h-3 bg-amber-800/40" />
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-amber-700 uppercase tracking-wider leading-none mb-0.5">næste niveau</span>
                        <span className="text-[13px] font-black text-amber-400 tabular-nums leading-none">
                          {displayMin > 0 ? `${displayMin}m ` : ""}{displaySec}s
                        </span>
                      </div>
                    </>
                  )}
                  {tanLevel === 4 && <span className="text-[12px] text-amber-500 font-semibold">Max brunet 🔥</span>}
                </div>
              );
            })()}

            {/* Visit request incoming */}
            {visitRequest && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3 px-5 py-4 bg-[#070f1e]/98 backdrop-blur-xl rounded-2xl border border-violet-500/30 shadow-[0_16px_48px_rgba(0,0,0,0.8)] w-72">
                <div className="flex items-center gap-2"><Rocket className="w-4 h-4 text-violet-400" /><span className="text-[15px] font-bold text-white">Besøgsanmodning</span></div>
                <p className="text-[14px] text-slate-300 text-center"><span className="text-violet-300 font-semibold">{visitRequest.from_name}</span> vil besøge dit rumskib</p>
                <div className="flex gap-2 w-full">
                  <button onClick={() => { channelRef.current?.send({ type: "broadcast", event: "spaceship_invite", payload: { to_id: visitRequest.from_id, accepted: true, spaceship_room_id: visitRequest.spaceship_room_id, spaceship_room_name: visitRequest.spaceship_room_name, cols: mySpaceship?.cols, rows: mySpaceship?.rows, theme_key: mySpaceship?.theme_key, floor_pattern: mySpaceship?.floor_pattern } }); setVisitRequest(null); }} className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[14px] font-semibold transition-colors">Accepter</button>
                  <button onClick={() => { channelRef.current?.send({ type: "broadcast", event: "spaceship_invite", payload: { to_id: visitRequest.from_id, accepted: false } }); setVisitRequest(null); }} className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-[14px] font-semibold transition-colors">Afvis</button>
                </div>
              </div>
            )}
            {/* Awaiting visit response */}
            {awaitingVisit && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 bg-[#070f1e]/98 backdrop-blur-xl rounded-2xl border border-violet-500/20 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                <Rocket className="w-4 h-4 text-violet-400 animate-pulse" />
                <span className="text-[14px] text-slate-300">Venter på svar...</span>
                <button onClick={() => setAwaitingVisit(false)} className="text-slate-600 hover:text-slate-400 ml-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Awaiting trade response */}
            {tradePendingPartner && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 bg-[#070f1e]/98 backdrop-blur-xl rounded-2xl border border-amber-500/20 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                <span className="text-amber-400 animate-pulse">⇄</span>
                <span className="text-[14px] text-slate-300">Venter på svar fra <span className="font-semibold" style={{ color: tradePendingPartner.partner_color }}>{tradePendingPartner.partner_name}</span>...</span>
                <button onClick={() => { setTradePendingPartner(null); tradeSessionRef.current = null; }} className="text-slate-600 hover:text-slate-400 ml-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {/* Muted indicator */}
            {myMutedUntil && new Date(myMutedUntil) > new Date() && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 bg-amber-950/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                <span className="text-amber-400 text-[15px]">🔇</span>
                <span className="text-[14px] font-semibold text-amber-300">Du er muttet indtil {new Date(myMutedUntil).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )}
            {/* Spam cooldown indicator */}
            {cooldownSec > 0 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 bg-rose-950/95 backdrop-blur-xl rounded-2xl border border-rose-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                <span className="text-rose-400 text-[15px]">⛔</span>
                <span className="text-[14px] font-semibold text-rose-300">Vent {cooldownSec}s — for mange beskeder</span>
              </div>
            )}

            {/* Floating draft bubble */}
            {draft && cooldownSec === 0 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2.5 bg-[#040c19]/98 backdrop-blur-xl rounded-2xl border border-white/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.7)] max-w-[340px]">
                <span className="text-[15px] text-slate-200 flex-1 truncate font-medium">{draft}</span>
                <span className="text-[12px] text-slate-600 tabular-nums flex-shrink-0">{draft.length}/100</span>
                <kbd className="text-[11px] text-slate-500 flex-shrink-0 bg-white/[0.07] border border-white/[0.08] px-1.5 py-0.5 rounded-md font-mono">↵</kbd>
                <button onClick={() => { draftRef.current = ""; setDraft(""); }} className="text-slate-600 hover:text-rose-400 flex-shrink-0 transition-colors ml-0.5"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Floating toolbar dock */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-3 py-2.5 bg-[#040c19]/98 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)]">
              <button onClick={() => { disconnectedRef.current = false; setDisconnected(false); lastActivityRef.current = Date.now(); setReconnectKey(k => k + 1); reloadChat(); }} className="p-2.5 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all" title="Genindlæs / Genopret forbindelse"><RefreshCw className="w-[22px] h-[22px]" /></button>
              <div className="w-px h-6 bg-white/[0.08] mx-1" />
              <button onClick={() => setRightPanel(p => p === "chatlog" ? "hidden" : "chatlog")} className={`p-2.5 rounded-xl transition-all ${rightPanel === "chatlog" ? "text-violet-400 bg-violet-500/15" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Chatlog"><MessageSquare className="w-[22px] h-[22px]" /></button>
              <button onClick={() => setRightPanel(p => p === "online" ? "hidden" : "online")} className={`p-2.5 rounded-xl transition-all relative ${rightPanel === "online" ? "text-emerald-400 bg-emerald-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Online">
                <Users className="w-[22px] h-[22px]" />
                {globalUsers.size > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-emerald-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{globalUsers.size}</span>}
              </button>
              <button onClick={() => { setRightPanel(p => p === "wardrobe" ? "hidden" : "wardrobe"); setWardrobeActiveSlot(null); setWardrobePreviewId(null); }} className={`p-2.5 rounded-xl transition-all ${rightPanel === "wardrobe" ? "text-violet-400 bg-violet-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Garderobe">
                <Shirt className="w-[22px] h-[22px]" />
              </button>
              <button onClick={() => setRightPanel(p => p === "inventory" ? "hidden" : "inventory")} className={`p-2.5 rounded-xl transition-all relative ${rightPanel === "inventory" ? "text-violet-400 bg-violet-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Rygsæk">
                <Package className="w-[22px] h-[22px]" />
                {myInventory.length > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-violet-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{myInventory.length}</span>}
              </button>
              <button onClick={() => setRightPanel(p => p === "rooms" ? "hidden" : "rooms")} className={`p-2.5 rounded-xl transition-all ${rightPanel === "rooms" ? "text-violet-400 bg-violet-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Rum"><Hash className="w-[22px] h-[22px]" /></button>
              {isAdmin && <button onClick={() => setRightPanel(p => p === "admin" ? "hidden" : "admin")} className={`p-2.5 rounded-xl transition-all ${rightPanel === "admin" ? "text-rose-400 bg-rose-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Admin"><Wrench className="w-[22px] h-[22px]" /></button>}
              <button onClick={() => setRightPanel(p => p === "settings" ? "hidden" : "settings")} className={`p-2.5 rounded-xl transition-all ${rightPanel === "settings" ? "text-violet-400 bg-violet-500/15" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Indstillinger"><Settings className="w-[22px] h-[22px]" /></button>
              <button onClick={() => setRightPanel(p => p === "achievements" ? "hidden" : "achievements")} className={`p-2.5 rounded-xl transition-all ${rightPanel === "achievements" ? "text-amber-400 bg-amber-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Bedrifter"><Trophy className="w-[22px] h-[22px]" /></button>
              <button onClick={() => setRightPanel(p => p === "dms" || p === "dm_chat" ? "hidden" : "dms")} className={`p-2.5 rounded-xl transition-all relative ${rightPanel === "dms" || rightPanel === "dm_chat" ? "text-violet-400 bg-violet-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Beskeder">
                <Mail className="w-[22px] h-[22px]" />
                {dmUnread > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-violet-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{dmUnread}</span>}
              </button>
              {activeRoomType === "casino" && (
                <button onClick={() => setRightPanel(p => p === "roulette" ? "hidden" : "roulette")} className={`p-2.5 rounded-xl transition-all ${rightPanel === "roulette" ? "text-amber-400 bg-amber-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]"}`} title="Roulette">
                  <span className="text-[22px] leading-none">🎰</span>
                </button>
              )}
              <div className="w-px h-6 bg-white/[0.08] mx-1" />
              <button onClick={() => setZoom(z => Math.min(2.5, parseFloat((z + 0.2).toFixed(1))))} className="p-2.5 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all" title="Zoom ind"><ZoomIn className="w-[22px] h-[22px]" /></button>
              <span className="text-[12px] text-slate-600 w-8 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.max(0.4, parseFloat((z - 0.2).toFixed(1))))} className="p-2.5 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all" title="Zoom ud"><ZoomOut className="w-[22px] h-[22px]" /></button>
            </div>
          </div>

          {/* Extension panel - overlays room area */}
          {extensionOpen && (
          <div className={`absolute right-2 top-2 bottom-2 z-30 rounded-2xl border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl w-[min(400px,calc(100%-16px))] flex flex-col bg-[#030912]/98 overflow-hidden`}>
            {/* Roulette panel */}
            {rightPanel === "roulette" && activeRoomType === "casino" && (() => {
              const betLabel = (type: string, value: string) =>
                type === "number" ? `#${value}` : type === "red" ? "Rød" : type === "black" ? "Sort" : type === "green" ? "Grøn" : type === "odd" ? "Ulige" : type === "even" ? "Lige" : type === "low" ? "1-18" : type === "high" ? "19-36" : type === "dozen1" ? "1-12" : type === "dozen2" ? "13-24" : type === "dozen3" ? "25-36" : type;
              const maxPayout = (type: string) => type === "number" || type === "green" ? 36 : type.startsWith("dozen") || type.startsWith("col") ? 3 : 2;
              const oddsLabel = (type: string) => type === "number" || type === "green" ? "35:1" : type.startsWith("dozen") || type.startsWith("col") ? "2:1" : "1:1";
              return (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎰</span>
                    <span className="text-[14px] font-bold text-slate-200">Roulette</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${roulettePhase === "betting" ? "bg-emerald-500/20 text-emerald-400" : roulettePhase === "spinning" ? "bg-amber-500/20 text-amber-400 animate-pulse" : "bg-violet-500/20 text-violet-400"}`}>
                      {roulettePhase === "betting" ? `Indsats · ${rouletteTimeLeft}s` : roulettePhase === "spinning" ? "Spinner..." : "Resultat"}
                    </span>
                  </div>
                  <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/[0.06] flex-shrink-0">
                  {(["bet", "history"] as const).map(tab => (
                    <button key={tab} onClick={() => {
                      setRouletteTab(tab);
                      if (tab === "history") {
                        supabase.from("roulette_bets").select("*").eq("user_id", currentProfile.id).eq("room_id", activeRoomId).order("created_at", { ascending: false }).limit(30).then(({ data }) => { if (data) setRouletteMyHistory(data as RouletteBet[]); });
                      }
                    }}
                      className={`flex-1 py-2 text-[12px] font-bold transition-colors ${rouletteTab === tab ? "text-amber-400 border-b-2 border-amber-400 -mb-px" : "text-slate-500 hover:text-slate-300"}`}>
                      {tab === "bet" ? "Spil" : "Mine bets"}
                    </button>
                  ))}
                </div>

                {/* ── Tab: Spil ── */}
                {rouletteTab === "bet" && (
                  <div className="flex-1 overflow-y-auto flex flex-col">

                    {/* Win toast */}
                    {rouletteLastWin !== null && (
                      <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        <div>
                          <p className="text-[13px] font-bold text-emerald-400">Du vandt!</p>
                          <p className="text-[12px] text-emerald-300">+{rouletteLastWin} 🪙</p>
                        </div>
                      </div>
                    )}

                    {/* Result display */}
                    {roulettePhase !== "betting" && rouletteRound && (
                      <div className="mx-3 mt-3 px-4 py-3 rounded-xl border text-center"
                        style={{
                          background: roulettePhase === "finished"
                            ? (rouletteColor(rouletteRound.result) === "red" ? "rgba(127,29,29,0.3)" : rouletteColor(rouletteRound.result) === "green" ? "rgba(6,78,59,0.3)" : "rgba(17,24,39,0.5)")
                            : "rgba(30,20,5,0.4)",
                          borderColor: roulettePhase === "finished"
                            ? (rouletteColor(rouletteRound.result) === "red" ? "rgba(239,68,68,0.3)" : rouletteColor(rouletteRound.result) === "green" ? "rgba(16,185,129,0.3)" : "rgba(107,114,128,0.3)")
                            : "rgba(251,191,36,0.2)"
                        }}>
                        {roulettePhase === "spinning" && <p className="text-[13px] text-amber-400 font-bold animate-pulse">🎰 Spinner...</p>}
                        {roulettePhase === "finished" && (
                          <>
                            <p className="text-[28px] font-black tabular-nums" style={{ color: rouletteColor(rouletteRound.result) === "red" ? "#ef4444" : rouletteColor(rouletteRound.result) === "green" ? "#10b981" : "#f9fafb" }}>{rouletteRound.result}</p>
                            <p className="text-[12px] font-semibold mt-0.5" style={{ color: rouletteColor(rouletteRound.result) === "red" ? "#fca5a5" : rouletteColor(rouletteRound.result) === "green" ? "#6ee7b7" : "#9ca3af" }}>
                              {rouletteColor(rouletteRound.result) === "red" ? "Rød" : rouletteColor(rouletteRound.result) === "green" ? "Grøn" : "Sort"} · {rouletteRound.result === 0 ? "—" : rouletteRound.result % 2 === 0 ? "Lige" : "Ulige"}
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Bet form — betting phase */}
                    {roulettePhase === "betting" && (
                      <div className="mx-3 mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">

                        {/* Quick bets row */}
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Hurtig indsats</p>
                        <div className="grid grid-cols-3 gap-1 mb-2">
                          {[
                            { type: "red",    value: "red",    label: "Rød",   bg: "#7f1d1d", border: "#dc2626", tc: "#fca5a5" },
                            { type: "black",  value: "black",  label: "Sort",  bg: "#111827", border: "#4b5563", tc: "#d1d5db" },
                            { type: "green",  value: "green",  label: "0 Grøn",bg: "#064e3b", border: "#059669", tc: "#6ee7b7" },
                            { type: "odd",    value: "odd",    label: "Ulige", bg: "#1e1b4b", border: "#6366f1", tc: "#a5b4fc" },
                            { type: "even",   value: "even",   label: "Lige",  bg: "#1e1b4b", border: "#6366f1", tc: "#a5b4fc" },
                            { type: "low",    value: "low",    label: "1–18",  bg: "#172554", border: "#3b82f6", tc: "#93c5fd" },
                            { type: "high",   value: "high",   label: "19–36", bg: "#172554", border: "#3b82f6", tc: "#93c5fd" },
                            { type: "dozen1", value: "dozen1", label: "1–12",  bg: "#431407", border: "#f97316", tc: "#fdba74" },
                            { type: "dozen2", value: "dozen2", label: "13–24", bg: "#431407", border: "#f97316", tc: "#fdba74" },
                            { type: "dozen3", value: "dozen3", label: "25–36", bg: "#431407", border: "#f97316", tc: "#fdba74" },
                          ].map(opt => (
                            <button key={opt.type}
                              onClick={() => { setRouletteBetType(opt.type); setRouletteBetValue(opt.value); }}
                              className="py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all"
                              style={{
                                background: rouletteBetType === opt.type ? opt.bg : "rgba(255,255,255,0.03)",
                                borderColor: rouletteBetType === opt.type ? opt.border : "rgba(255,255,255,0.07)",
                                color: rouletteBetType === opt.type ? opt.tc : "#64748b",
                                boxShadow: rouletteBetType === opt.type ? `0 0 8px ${opt.border}55` : "none",
                              }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {/* Number grid - collapsible */}
                        <button
                          onClick={() => setRouletteNumberGridOpen(o => !o)}
                          className="w-full flex items-center justify-between mb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors">
                          <span>Direkte tal (35:1){rouletteSelectedNums.size > 0 && <span className="ml-1.5 text-amber-400 normal-case font-black">{rouletteSelectedNums.size} valgt</span>}</span>
                          <span className="text-slate-600">{rouletteNumberGridOpen ? "▲" : "▼"}</span>
                        </button>
                        {rouletteNumberGridOpen && (
                          <div className="mb-2.5">
                            {/* 0 */}
                            <button
                              onClick={() => {
                                setRouletteSelectedNums(prev => {
                                  const next = new Set(prev);
                                  if (next.has(0)) next.delete(0); else next.add(0);
                                  return next;
                                });
                                setRouletteBetType("number");
                              }}
                              className="w-full py-1 rounded text-[11px] font-black mb-0.5 border-2 transition-all"
                              style={{ background: rouletteSelectedNums.has(0) ? "#064e3b" : "#052e16", borderColor: rouletteSelectedNums.has(0) ? "#10b981" : "#065f46", color: "#6ee7b7" }}>
                              0
                            </button>
                            {/* 1-36 grid */}
                            <div className="grid grid-cols-3 gap-0.5">
                              {Array.from({ length: 12 }, (_, rowIdx) =>
                                [1, 2, 3].map(col => {
                                  const n = (11 - rowIdx) * 3 + col;
                                  if (n < 1 || n > 36) return null;
                                  const colR = rouletteColor(n);
                                  const sel = rouletteSelectedNums.has(n);
                                  return (
                                    <button key={n}
                                      onClick={() => {
                                        setRouletteSelectedNums(prev => {
                                          const next = new Set(prev);
                                          if (next.has(n)) next.delete(n); else next.add(n);
                                          return next;
                                        });
                                        setRouletteBetType("number");
                                      }}
                                      className="py-1 rounded text-[10px] font-black border transition-all"
                                      style={{
                                        background: sel ? (colR === "red" ? "#991b1b" : "#1f2937") : (colR === "red" ? "#450a0a" : "#0f172a"),
                                        borderColor: sel ? (colR === "red" ? "#ef4444" : "#6b7280") : "transparent",
                                        color: colR === "red" ? "#fca5a5" : "#d1d5db",
                                        boxShadow: sel ? `0 0 6px ${colR === "red" ? "#ef444455" : "#6b728055"}` : "none",
                                      }}>
                                      {n}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                            {rouletteSelectedNums.size > 0 && (
                              <button onClick={() => setRouletteSelectedNums(new Set())} className="mt-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                                Ryd valg
                              </button>
                            )}
                          </div>
                        )}

                        {/* Amount chips */}
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Beløb 🪙</p>
                        <div className="flex gap-1 mb-1.5">
                          {[10, 25, 50, 100, 250, 500].map(amt => (
                            <button key={amt}
                              onClick={() => setRouletteBetAmount(amt)}
                              className="flex-1 py-1 rounded text-[10px] font-black transition-all border"
                              style={{
                                background: rouletteBetAmount === amt ? "#92400e" : "rgba(255,255,255,0.04)",
                                borderColor: rouletteBetAmount === amt ? "#f59e0b" : "rgba(255,255,255,0.07)",
                                color: rouletteBetAmount === amt ? "#fde68a" : "#64748b",
                              }}>
                              {amt}
                            </button>
                          ))}
                        </div>
                        <input type="number" min={1} max={coins} value={rouletteBetAmount}
                          onChange={e => setRouletteBetAmount(Math.max(1, Math.min(coins, parseInt(e.target.value) || 1)))}
                          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[13px] text-white outline-none focus:border-amber-500/50 mb-2" />

                        {/* Summary */}
                        {(() => {
                          const isNumBet = rouletteBetType === "number" && rouletteSelectedNums.size > 0;
                          const numCount = isNumBet ? rouletteSelectedNums.size : 1;
                          const totalCost = rouletteBetAmount * numCount;
                          const label = isNumBet
                            ? `${Array.from(rouletteSelectedNums).sort((a,b)=>a-b).join(", ")}`
                            : betLabel(rouletteBetType, rouletteBetValue);
                          const odds = isNumBet ? "35:1" : oddsLabel(rouletteBetType);
                          const maxWin = isNumBet ? rouletteBetAmount * 36 : rouletteBetAmount * maxPayout(rouletteBetType);
                          return (
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] text-slate-500 truncate max-w-[130px]">
                                {label}
                                <span className="text-slate-700 mx-1">·</span>
                                <span className="text-amber-400/70">{odds}</span>
                                {numCount > 1 && <span className="text-slate-600 ml-1">×{numCount}</span>}
                              </p>
                              <p className="text-[11px] font-bold text-emerald-500 flex-shrink-0">max {maxWin} 🪙</p>
                            </div>
                          );
                        })()}

                        {/* Place bet + repeat */}
                        <div className="flex gap-1.5">
                          <button
                            disabled={coins < rouletteBetAmount}
                            onClick={async () => {
                              if (!rouletteRound || roulettePhase !== "betting") return;
                              const isNumBet = rouletteBetType === "number" && rouletteSelectedNums.size > 0;
                              const numsToPlace = isNumBet ? Array.from(rouletteSelectedNums) : [];
                              const totalCost = rouletteBetAmount * (isNumBet ? numsToPlace.length : 1);
                              if (coins < totalCost) return;
                              const roundId = rouletteRound.id;
                              const newCoins = coinsRef.current - totalCost;
                              coinsRef.current = newCoins;
                              setCoins(newCoins);
                              await supabase.from("profiles").update({ coins: newCoins }).eq("id", currentProfile.id);
                              if (isNumBet) {
                                rouletteLastBetRef.current = { type: "number", value: "", nums: numsToPlace, amount: rouletteBetAmount };
                                const inserts = numsToPlace.map(n => ({
                                  round_id: roundId, room_id: activeRoomId,
                                  user_id: currentProfile.id, display_name: currentProfile.display_name,
                                  avatar_color: myColor, bet_type: "number",
                                  bet_value: String(n), amount: rouletteBetAmount,
                                }));
                                const { data: newBets } = await supabase.from("roulette_bets").insert(inserts).select();
                                if (newBets) setRouletteBets(prev => [...prev, ...(newBets as RouletteBet[])]);
                              } else {
                                rouletteLastBetRef.current = { type: rouletteBetType, value: rouletteBetValue, nums: [], amount: rouletteBetAmount };
                                const { data: newBet } = await supabase.from("roulette_bets").insert({
                                  round_id: roundId, room_id: activeRoomId,
                                  user_id: currentProfile.id, display_name: currentProfile.display_name,
                                  avatar_color: myColor, bet_type: rouletteBetType,
                                  bet_value: rouletteBetValue, amount: rouletteBetAmount,
                                }).select().single();
                                if (newBet) setRouletteBets(prev => [...prev, newBet as RouletteBet]);
                              }
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all ${coins >= rouletteBetAmount ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 shadow-[0_4px_16px_rgba(245,158,11,0.3)]" : "bg-white/[0.05] text-slate-600 cursor-not-allowed"}`}>
                            Sæt ind · {rouletteBetAmount * (rouletteBetType === "number" && rouletteSelectedNums.size > 0 ? rouletteSelectedNums.size : 1)} 🪙
                          </button>
                          {rouletteLastBetRef.current && (
                            <button
                              disabled={coins < rouletteLastBetRef.current.amount}
                              onClick={async () => {
                                const last = rouletteLastBetRef.current;
                                if (!last || !rouletteRound || roulettePhase !== "betting") return;
                                const isNumBet = last.type === "number" && last.nums.length > 0;
                                const totalCost = last.amount * (isNumBet ? last.nums.length : 1);
                                if (coins < totalCost) return;
                                const roundId = rouletteRound.id;
                                const newCoins = coinsRef.current - totalCost;
                                coinsRef.current = newCoins;
                                setCoins(newCoins);
                                await supabase.from("profiles").update({ coins: newCoins }).eq("id", currentProfile.id);
                                if (isNumBet) {
                                  const inserts = last.nums.map(n => ({ round_id: roundId, room_id: activeRoomId, user_id: currentProfile.id, display_name: currentProfile.display_name, avatar_color: myColor, bet_type: "number", bet_value: String(n), amount: last.amount }));
                                  const { data: newBets } = await supabase.from("roulette_bets").insert(inserts).select();
                                  if (newBets) setRouletteBets(prev => [...prev, ...(newBets as RouletteBet[])]);
                                } else {
                                  const { data: newBet } = await supabase.from("roulette_bets").insert({ round_id: roundId, room_id: activeRoomId, user_id: currentProfile.id, display_name: currentProfile.display_name, avatar_color: myColor, bet_type: last.type, bet_value: last.value, amount: last.amount }).select().single();
                                  if (newBet) setRouletteBets(prev => [...prev, newBet as RouletteBet]);
                                }
                              }}
                              className="px-3 py-2.5 rounded-xl text-[11px] font-bold bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all" title="Gentag sidste bet">
                              ↺
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Live bets */}
                    <div className="mx-3 mt-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Aktive indsatser ({rouletteBets.length})</p>
                      {rouletteBets.length === 0
                        ? <p className="text-[12px] text-slate-700 italic">Ingen indsatser endnu</p>
                        : <div className="space-y-1 max-h-40 overflow-y-auto">
                            {rouletteBets.map(bet => {
                              const isMe = bet.user_id === currentProfile.id;
                              return (
                                <div key={bet.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isMe ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/[0.03] border border-white/[0.04]"}`}>
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: bet.avatar_color ?? "#8b5cf6" }} />
                                  <span className="text-[11px] font-semibold flex-1 truncate" style={{ color: bet.avatar_color ?? "#8b5cf6" }}>{bet.display_name}</span>
                                  <span className="text-[10px] text-slate-500 font-bold">{betLabel(bet.bet_type, bet.bet_value)}</span>
                                  <span className="text-[10px] font-black text-amber-400">{bet.amount}🪙</span>
                                  {bet.won != null && (
                                    <span className={`text-[10px] font-black ${bet.won ? "text-emerald-400" : "text-rose-400"}`}>{bet.won ? `+${bet.payout}` : "✗"}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                      }
                    </div>

                    {/* Recent results */}
                    <div className="mx-3 mt-3 mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Seneste resultater</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rouletteHistory.map(h => {
                          const col = rouletteColor(h.result);
                          return (
                            <div key={h.id} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
                              style={{ background: col === "red" ? "#7f1d1d" : col === "green" ? "#064e3b" : "#111827", color: col === "red" ? "#fca5a5" : col === "green" ? "#6ee7b7" : "#d1d5db", border: `1px solid ${col === "red" ? "#dc2626" : col === "green" ? "#059669" : "#374151"}` }}>
                              {h.result}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Tab: Mine bets ── */}
                {rouletteTab === "history" && (
                  <div className="flex-1 overflow-y-auto p-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Mine seneste bets</p>
                    {rouletteMyHistory.length === 0
                      ? <p className="text-[12px] text-slate-700 italic">Ingen bets endnu</p>
                      : <div className="space-y-1.5">
                          {rouletteMyHistory.map(bet => (
                            <div key={bet.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${bet.resolved ? (bet.won ? "bg-emerald-500/8 border-emerald-500/20" : "bg-rose-500/8 border-rose-500/15") : "bg-white/[0.03] border-white/[0.05]"}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] font-bold text-slate-200">{betLabel(bet.bet_type, bet.bet_value)}</span>
                                  <span className="text-[10px] text-slate-600">·</span>
                                  <span className="text-[11px] text-amber-400 font-bold">{bet.amount}🪙</span>
                                </div>
                                <p className="text-[10px] text-slate-600 mt-0.5">{new Date(bet.created_at ?? "").toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}</p>
                              </div>
                              {bet.resolved
                                ? bet.won
                                  ? <span className="text-[12px] font-black text-emerald-400">+{bet.payout}🪙</span>
                                  : <span className="text-[12px] font-black text-rose-400">Tabt</span>
                                : <span className="text-[11px] text-slate-600 animate-pulse">Afventer...</span>
                              }
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                )}

                {/* ── Admin controls ── */}
                {isAdmin && (
                  <div className="mx-3 mb-3 mt-2 p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/20 flex-shrink-0">
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-2">Admin · Bord</p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setRouletteMoveMode(m => !m)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${rouletteMoveMode ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-300" : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200"}`}>
                        {rouletteMoveMode ? "Klik en tile..." : "Flyt bord"}
                      </button>
                      <button
                        onClick={() => {
                          const ns = Math.max(0.5, parseFloat((rouletteScale - 0.25).toFixed(2)));
                          setRouletteScale(ns);
                          supabase.from("chat_rooms").update({ roulette_scale: ns }).eq("id", activeRoomId).then(() => {});
                        }}
                        className="w-9 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200 font-bold text-[14px] flex items-center justify-center transition-colors">−</button>
                      <span className="w-8 flex items-center justify-center text-[11px] font-bold text-slate-400">{rouletteScale.toFixed(1)}×</span>
                      <button
                        onClick={() => {
                          const ns = Math.min(3.0, parseFloat((rouletteScale + 0.25).toFixed(2)));
                          setRouletteScale(ns);
                          supabase.from("chat_rooms").update({ roulette_scale: ns }).eq("id", activeRoomId).then(() => {});
                        }}
                        className="w-9 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200 font-bold text-[14px] flex items-center justify-center transition-colors">+</button>
                    </div>
                  </div>
                )}
              </>
              );
            })()}

            {/* Online users */}
            {rightPanel === "online" && (
              <>
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                    <span className="text-[13px] font-bold text-slate-200 tracking-wide">Online</span>
                    <span className="text-[12px] font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">{globalUsers.size}</span>
                  </div>
                  <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {Array.from(globalUsers.values())
                    .sort((a, b) => {
                      // Own entry first, then same room, then others
                      const aMe = a.user_id === currentProfile.id ? 0 : 1;
                      const bMe = b.user_id === currentProfile.id ? 0 : 1;
                      if (aMe !== bMe) return aMe - bMe;
                      const aSame = a.room_id === activeRoomId ? 0 : 1;
                      const bSame = b.room_id === activeRoomId ? 0 : 1;
                      return aSame - bSame;
                    })
                    .map(u => {
                      const isMe = u.user_id === currentProfile.id;
                      const inSameRoom = u.room_id === activeRoomId;
                      const goToRoom = () => { const r = rooms.find(r => r.id === u.room_id); if (r) switchRoom(r.id, r.name, r.cols, r.rows, r.room_type, r.theme_key, r.floor_pattern, r.owner_id); };
                      // Time in room
                      const timeInRoom = (() => {
                        if (!u.room_joined_at) return null;
                        const secs = Math.floor((Date.now() - u.room_joined_at) / 1000);
                        if (secs < 60) return `${secs}s`;
                        if (secs < 3600) return `${Math.floor(secs / 60)}m`;
                        return `${Math.floor(secs / 3600)}t ${Math.floor((secs % 3600) / 60)}m`;
                      })();
                      const uOutfit = u.outfit ?? {};
                      return (
                        <div key={u.user_id} className={`px-3 py-2.5 flex items-center gap-3 border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors group ${inSameRoom ? "bg-violet-500/[0.03]" : ""}`}>
                          {/* Mini avatar */}
                          {(() => {
                            const isIdle = !!u.last_activity && Date.now() - u.last_activity > 10 * 60 * 1000;
                            return (
                              <div className="relative flex-shrink-0">
                                <div className="w-10 h-12 rounded-lg overflow-hidden flex items-end justify-center" style={{ background: u.color + "18", border: `1px solid ${u.color}30` }}>
                                  <svg width="36" height="44" viewBox="-14 -30 28 50" style={{ overflow: "visible" }}>
                                    <PersonAvatar color={u.color} glow={!!u.is_admin} />
                                    {Object.keys(uOutfit).length > 0 && <ClothingOverlay outfit={uOutfit} catalog={clothingCatalog} />}
                                    {isIdle && (
                                      <g style={{ pointerEvents: "none" }}>
                                        {[{ sz: 5, dx: 8,  y: -28, delay: "0s"   },
                                          { sz: 6, dx: 13, y: -34, delay: "0.7s" },
                                          { sz: 7, dx: 19, y: -41, delay: "1.4s" }].map(({ sz, dx, y, delay }, i) => (
                                          <text key={i} x={dx} y={y} textAnchor="middle" fontSize={sz} fontWeight="900"
                                            fill="#fbbf24" fontFamily="system-ui,sans-serif"
                                            stroke="rgba(0,0,0,0.7)" strokeWidth={1} paintOrder="stroke" opacity={0}>
                                            <animate attributeName="opacity" values="0;1;0" dur="2.4s" begin={delay} repeatCount="indefinite" />
                                            <animate attributeName="y" from={`${y}`} to={`${y - 8}`} dur="2.4s" begin={delay} repeatCount="indefinite" />
                                            Z
                                          </text>
                                        ))}
                                      </g>
                                    )}
                                  </svg>
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#07101c] shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                              </div>
                            );
                          })()}
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-[13px] font-semibold truncate" style={{ color: u.color }}>{u.display_name}{isMe ? " (dig)" : ""}</p>
                              {u.is_admin && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 flex-shrink-0">MOD</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[11px] truncate ${inSameRoom ? "text-violet-400" : "text-slate-600"}`}>#{u.room_name}</span>
                              {timeInRoom && <span className="text-[10px] text-slate-700 flex-shrink-0">· {timeInRoom}</span>}
                            </div>
                          </div>
                          {/* Go-to button */}
                          {!isMe && !inSameRoom && (
                            <button onClick={goToRoom} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold px-2 py-1 rounded-md bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 border border-violet-500/20">
                              Gå til
                            </button>
                          )}
                          {inSameRoom && !isMe && (
                            <span className="flex-shrink-0 text-[10px] text-violet-500/60">Her</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* Wardrobe moved to modal overlay */}

            {/* Shop */}
            {rightPanel === "shop" && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest">Butik</span>
                    <span className="text-[13px] text-amber-400 font-semibold">🪙 {coins}</span>
                  </div>
                  <button onClick={() => setRightPanel("hidden")} className="text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {CLOTHING_SLOTS.map(slot => {
                    const slotItems = clothingCatalog.filter(c => c.slot === slot.id);
                    if (slotItems.length === 0) return null;
                    return (
                      <div key={slot.id} className="border-b border-white/[0.04]">
                        <div className="px-3 py-1.5 flex items-center gap-1.5">
                          <span className="text-sm">{slot.emoji}</span>
                          <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">{slot.label}</span>
                        </div>
                        {slotItems.map(item => {
                          const owned = myWardrobe.some(w => w.clothing_id === item.id);
                          const canAfford = coins >= item.price;
                          return (
                            <div key={item.id} className="px-3 py-1.5 flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                              <span className={`text-[13px] flex-1 truncate ${owned ? "text-violet-300" : canAfford ? "text-slate-300" : "text-slate-600"}`}>{item.name}</span>
                              {owned
                                ? <span className="text-[11px] text-emerald-500 flex-shrink-0">Ejet</span>
                                : <button onClick={() => buyItem(item)} disabled={!canAfford} className={`text-[11px] flex-shrink-0 px-1.5 py-0.5 rounded font-semibold transition-colors ${canAfford ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "text-slate-700 cursor-not-allowed"}`}>
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
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-violet-400" />
                    <span className="text-[14px] font-bold text-slate-200 tracking-wide">Skift rum</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isAdmin && <button onClick={() => setCreateRoomForm({ name: "", cols: 10, rows: 8, room_type: "normal", theme_key: "blue", floor_pattern: "standard" })} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Opret rum"><Plus className="w-3.5 h-3.5" /></button>}
                    <button onClick={() => setRightPanel("hidden")} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"><X className="w-3.5 h-3.5" /></button>
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
                      <p className="text-[12px] font-bold text-slate-400 mb-2">{isEdit ? "Rediger rum" : "Nyt rum"}</p>
                      <input autoFocus value={form.name} onChange={e => set({ ...form, name: e.target.value })} onKeyDown={e => { if (e.key === "Escape") { isEdit ? setEditRoomForm(null) : setCreateRoomForm(null); } }} placeholder="Rum navn..." className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[13px] text-slate-100 outline-none mb-2 focus:border-violet-500/50" />
                      <div className="flex gap-1.5 mb-2">
                        <div className="flex-1"><p className="text-[11px] text-slate-500 mb-0.5">Bredde</p><input type="number" min={4} max={20} value={form.cols} onChange={e => set({ ...form, cols: Math.max(4, Math.min(20, parseInt(e.target.value) || 10)) })} className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[13px] text-slate-100 outline-none focus:border-violet-500/50" /></div>
                        <div className="flex-1"><p className="text-[11px] text-slate-500 mb-0.5">Dybde</p><input type="number" min={4} max={16} value={form.rows} onChange={e => set({ ...form, rows: Math.max(4, Math.min(16, parseInt(e.target.value) || 8)) })} className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[13px] text-slate-100 outline-none focus:border-violet-500/50" /></div>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-0.5">Type</p>
                      <select value={form.room_type} onChange={e => set({ ...form, room_type: e.target.value })} className="w-full bg-[#0a1220] border border-white/[0.08] rounded px-2 py-1 text-[13px] text-slate-300 outline-none mb-2">
                        <option value="normal">Normal</option>
                        <option value="shop">Butik</option>
                        <option value="solarie">☀️ Solarie</option>
                        <option value="casino">🎰 Casino</option>
                      </select>
                      <p className="text-[11px] text-slate-500 mb-1">Farvetema</p>
                      <div className="grid grid-cols-5 gap-1.5 mb-2">
                        {ROOM_THEMES.map(t => (
                          <button key={t.id} onClick={() => set({ ...form, theme_key: t.id })} title={t.label}
                            className={`w-full aspect-square rounded-lg border-2 transition-all ${form.theme_key === t.id ? "border-white scale-110" : "border-transparent hover:border-white/40"}`}
                            style={{ backgroundColor: t.color }} />
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-1">Gulvmønster</p>
                      <div className="grid grid-cols-2 gap-1 mb-2.5">
                        {FLOOR_PATTERNS.map(p => (
                          <button key={p.id} onClick={() => set({ ...form, floor_pattern: p.id })}
                            className={`py-1 rounded-lg text-[12px] font-medium transition-all ${form.floor_pattern === p.id ? "bg-violet-500/30 text-violet-200 border border-violet-500/50" : "bg-white/[0.04] text-slate-400 border border-transparent hover:border-white/10"}`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-600 mb-2">{form.cols * form.rows} felter</p>
                      <div className="flex gap-1">
                        <button onClick={isEdit ? updateRoom : createRoom} className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-[12px] font-semibold text-white transition-colors">{isEdit ? "Gem" : "Opret"}</button>
                        <button onClick={() => { isEdit ? setEditRoomForm(null) : setCreateRoomForm(null); }} className="flex-1 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-[12px] text-slate-300 transition-colors">Annuller</button>
                      </div>
                    </div>
                  );
                })()}
                {/* Room list */}
                <div className="flex-1 overflow-y-auto relative">
                  {/* Normal rooms */}
                  {(() => {
                    const normalRooms = rooms.filter(r => r.room_type !== "spaceship");
                    const spaceshipRooms = rooms.filter(r => r.room_type === "spaceship");
                    return (
                      <>
                        {normalRooms.length > 0 && (
                          <>
                            <div className="px-4 pt-3.5 pb-1.5">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Rum</span>
                            </div>
                            {normalRooms.map((r, i) => {
                              const occ = roomOccupancy.get(r.id) ?? 0;
                              const rtheme = ROOM_THEMES.find(t => t.id === (r.theme_key ?? "blue"));
                              const isActive = r.id === activeRoomId;
                              return (
                                <div
                                  key={r.id}
                                  className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${isActive ? "bg-violet-500/15" : "hover:bg-white/[0.04]"}`}
                                  onMouseEnter={(e) => { setHoveredRoomId(r.id); const rect = e.currentTarget.getBoundingClientRect(); setTooltipPos({ x: rect.left - 4, y: rect.top }); }}
                                  onMouseLeave={() => { setHoveredRoomId(null); setTooltipPos(null); }}
                                  onClick={() => switchRoom(r.id, r.name, r.cols, r.rows, r.room_type, r.theme_key, r.floor_pattern, r.owner_id)}
                                >
                                  <span className="text-[12px] font-bold text-slate-700 w-4 text-right flex-shrink-0 tabular-nums">{i + 1}</span>
                                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_6px_currentColor]" style={{ backgroundColor: rtheme?.color ?? "#475569", color: rtheme?.color ?? "#475569" }} />
                                  <span className={`flex-1 text-[15px] font-semibold truncate ${isActive ? "text-violet-300" : "text-slate-200"}`}>{r.name}</span>
                                  {occ > 0 && <span className="text-[12px] font-bold text-emerald-400 bg-emerald-500/[0.12] border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">{occ}</span>}
                                  {isAdmin && <button onClick={e => { e.stopPropagation(); setCreateRoomForm(null); setEditRoomForm({ id: r.id, name: r.name, cols: r.cols, rows: r.rows, room_type: r.room_type, theme_key: r.theme_key ?? "blue", floor_pattern: r.floor_pattern ?? "standard" }); }} className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-violet-400 flex-shrink-0 transition-all" title="Rediger rum"><Pencil className="w-3 h-3" /></button>}
                                </div>
                              );
                            })}
                          </>
                        )}

                        {spaceshipRooms.length > 0 && (
                          <>
                            <div className="px-4 pt-3.5 pb-1.5 flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">🚀 Rumskibe</span>
                              <span className="text-[10px] text-slate-700">({spaceshipRooms.length})</span>
                            </div>
                            {spaceshipRooms.map(r => {
                              const occ = roomOccupancy.get(r.id) ?? 0;
                              const isOwn = r.owner_id === currentProfile.id;
                              const isActive = r.id === activeRoomId;
                              const ownerOnline = globalUsers.has(r.owner_id ?? "");
                              const hasPasscode = !!r.spaceship_passcode;
                              const rtheme = ROOM_THEMES.find(t => t.id === (r.theme_key ?? "blue"));
                              return (
                                <div
                                  key={r.id}
                                  className={`group flex items-center gap-3 px-4 py-3 transition-all ${isActive ? "bg-violet-500/15" : isOwn || hasPasscode || ownerOnline ? "cursor-pointer hover:bg-white/[0.04]" : "opacity-50 cursor-not-allowed"}`}
                                  onMouseEnter={(e) => { setHoveredRoomId(r.id); const rect = e.currentTarget.getBoundingClientRect(); setTooltipPos({ x: rect.left - 4, y: rect.top }); }}
                                  onMouseLeave={() => { setHoveredRoomId(null); setTooltipPos(null); }}
                                  onClick={() => {
                                    if (isOwn) {
                                      switchRoom(r.id, r.name, r.cols, r.rows, r.room_type, r.theme_key, r.floor_pattern, r.owner_id);
                                    } else if (hasPasscode) {
                                      setPasscodePrompt({ room: r });
                                      setPasscodeInput("");
                                      setPasscodeError(false);
                                    } else if (ownerOnline) {
                                      setAwaitingVisit(true);
                                      channelRef.current?.send({ type: "broadcast", event: "spaceship_request", payload: { to_id: r.owner_id, from_id: currentProfile.id, from_name: currentProfile.display_name, spaceship_room_id: r.id, spaceship_room_name: r.name } });
                                      setTimeout(() => setAwaitingVisit(false), 30000);
                                      setRightPanel("hidden");
                                    }
                                  }}
                                >
                                  <span className="text-base leading-none flex-shrink-0">🚀</span>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-[15px] font-semibold truncate ${isActive ? "text-violet-300" : "text-slate-200"}`}>{r.name}</p>
                                    <p className="text-[11px] truncate mt-0.5" style={{ color: rtheme?.color ?? "#475569", opacity: 0.7 }}>{isOwn ? "Dit rumskib" : hasPasscode ? "Kodeord påkrævet" : ownerOnline ? "Anmod om adgang" : "Ejeren er offline"}</p>
                                  </div>
                                  <span className="text-[13px] flex-shrink-0 leading-none" title={hasPasscode ? "Kodelåst" : "Åbent for anmodninger"}>{hasPasscode ? "🔒" : "🔓"}</span>
                                  {occ > 0 && <span className="text-[12px] font-bold text-emerald-400 bg-emerald-500/[0.12] border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">{occ}</span>}
                                </div>
                              );
                            })}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Inventory */}
            {rightPanel === "inventory" && (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest">Rygsæk ({myInventory.length})</span>
                  <button onClick={() => setRightPanel("hidden")} className="text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  {myInventory.length === 0 && <p className="text-[13px] text-slate-600 text-center mt-4">Ingen genstande</p>}
                  {myInventory.map(item => {
                    const meta = ITEM_TYPES.find(t => t.type === item.item_type);
                    return (
                      <div key={item.id} className={`px-3 py-2 flex items-center gap-2 hover:bg-white/[0.03] ${placingItem?.item.id === item.id ? "bg-violet-500/10" : ""}`}>
                        <div className="w-8 h-8 rounded bg-white/[0.05] flex items-center justify-center flex-shrink-0"><svg width="24" height="24" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg></div>
                        <div className="flex-1 min-w-0"><p className="text-[14px] text-slate-300 truncate">{item.name}</p><p className="text-[12px]" style={{ color: meta?.color ?? "#6b7280" }}>{meta?.label ?? item.item_type}</p></div>
                        {placingItem?.item.id === item.id
                          ? <button onClick={() => setPlacingItem(null)} className="p-1 rounded text-violet-400 hover:text-rose-400" title="Annuller"><X className="w-3 h-3" /></button>
                          : <>
                              <button onClick={() => setPlacingItem({ item, rotation: 0 })} className="px-1.5 py-0.5 rounded text-[11px] font-semibold text-violet-300 bg-violet-500/15 hover:bg-violet-500/25 transition-colors" title={isWallItemType(item.item_type) ? "Klik på væggen" : "Klik på et felt"}>Placer</button>
                            </>
                        }
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Admin panel */}
            {rightPanel === "admin" && isAdmin && (
              <>
                {/* Tab bar */}
                <div className="px-3 py-2.5 border-b border-white/[0.06] flex-shrink-0 bg-[#030912]/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Admin Panel</span>
                    <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex gap-1">
                    {(["users", "items", "bots", "self"] as const).map(tab => (
                      <button key={tab} onClick={() => setAdminTab(tab)} className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-colors ${adminTab === tab ? "bg-rose-500/20 text-rose-300" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"}`}>
                        {tab === "users" ? "Brugere" : tab === "items" ? "Ting" : tab === "bots" ? "Bots" : "Mig"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Users tab ── */}
                {adminTab === "users" && (
                  <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                    {/* Search */}
                    <div className="px-3 py-2 border-b border-white/[0.06] flex-shrink-0">
                      <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-1.5">
                        <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <input
                          value={adminSearchQuery}
                          onChange={async e => {
                            const q = e.target.value;
                            setAdminSearchQuery(q);
                            if (!q.trim()) { setAdminSearchResults([]); return; }
                            const { data } = await supabase.from("profiles").select("id, display_name, avatar_color, role, coins, xp, level, total_online_seconds, muted_until, is_banned, tan_level, name_color, aura_color").ilike("display_name", `%${q}%`).limit(20);
                            setAdminSearchResults((data ?? []) as Profile[]);
                          }}
                          placeholder="Søg bruger..."
                          className="flex-1 bg-transparent text-[13px] text-slate-200 placeholder-slate-600 outline-none"
                        />
                      </div>
                    </div>

                    {/* Edit modal */}
                    {adminEditTarget && (
                      <div className="mx-3 my-2 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[12px] font-bold text-rose-300">Rediger: {adminEditTarget.display_name}</span>
                          <button onClick={() => setAdminEditTarget(null)} className="text-slate-600 hover:text-slate-300"><X className="w-3 h-3" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          {([["XP", "xp"], ["Mønter", "coins"], ["Online sek.", "total_online_seconds"], ["Solarie lv.", "tan_level"]] as [string, "xp" | "coins" | "total_online_seconds" | "tan_level"][]).map(([label, key]) => (
                            <div key={key}>
                              <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                              <input
                                value={adminEditForm[key]}
                                onChange={e => setAdminEditForm(f => ({ ...f, [key]: e.target.value }))}
                                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1 text-[12px] text-slate-200 outline-none focus:border-rose-500/40"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="mb-2">
                          <p className="text-[10px] text-slate-500 mb-0.5">Muttet indtil (ISO)</p>
                          <input value={adminEditForm.muted_until} onChange={e => setAdminEditForm(f => ({ ...f, muted_until: e.target.value }))} placeholder="tom = ikke muttet" className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1 text-[12px] text-slate-200 outline-none focus:border-rose-500/40" />
                        </div>
                        <div className="mb-2">
                          <p className="text-[10px] text-slate-500 mb-1">Navn farve</p>
                          <div className="flex flex-wrap gap-1">
                            {([["#ffffff", "Hvid"], ["#c4b5fd", "Lilla"], ["#f87171", "Rød"], ["#fbbf24", "Guld"], ["#34d399", "Grøn"], ["#38bdf8", "Cyan"], ["#fb923c", "Orange"], [null, "Standard"]] as [string | null, string][]).map(([color, label]) => (
                              <button key={label} onClick={() => setAdminEditForm(f => ({ ...f, name_color: color }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${adminEditForm.name_color === color ? "border-white/40 bg-white/[0.15]" : "border-white/[0.06] bg-white/[0.03]"}`}
                                style={{ color: color ?? "#94a3b8" }}>{label}</button>
                            ))}
                          </div>
                        </div>
                        <div className="mb-2">
                          <p className="text-[10px] text-slate-500 mb-1">Aura farve</p>
                          <div className="flex flex-wrap gap-1">
                            {([["#c4b5fd", "Lilla"], ["#f87171", "Rød"], ["#fbbf24", "Guld"], ["#34d399", "Grøn"], ["#38bdf8", "Cyan"], ["#fb923c", "Orange"], ["#f472b6", "Pink"], [null, "Ingen"]] as [string | null, string][]).map(([color, label]) => (
                              <button key={label} onClick={() => setAdminEditForm(f => ({ ...f, aura_color: color }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${adminEditForm.aura_color === color ? "border-white/40 bg-white/[0.15]" : "border-white/[0.06] bg-white/[0.03]"}`}
                                style={{ color: color ?? "#94a3b8" }}>{label}</button>
                            ))}
                          </div>
                        </div>
                        <div className="mb-2">
                          <p className="text-[10px] text-slate-500 mb-1">Boble farve</p>
                          <div className="flex flex-wrap gap-1">
                            {([["#ffffff", "Hvid"], ["#c4b5fd", "Lilla"], ["#86efac", "Grøn"], ["#93c5fd", "Blå"], ["#fde68a", "Gul"], ["#fca5a5", "Rød"], [null, "Standard"]] as [string | null, string][]).map(([color, label]) => (
                              <button key={label} onClick={() => setAdminEditForm(f => ({ ...f, bubble_color: color }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${adminEditForm.bubble_color === color ? "border-white/40 bg-white/[0.15]" : "border-white/[0.06] bg-white/[0.03]"}`}
                                style={{ color: color ? "#111" : "#94a3b8", backgroundColor: color ?? "transparent" }}>{label}</button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const patch: Record<string, number | string | null> = {};
                            if (adminEditForm.xp !== "") patch.xp = parseInt(adminEditForm.xp) || 0;
                            if (adminEditForm.coins !== "") patch.coins = parseInt(adminEditForm.coins) || 0;
                            if (adminEditForm.total_online_seconds !== "") patch.total_online_seconds = parseInt(adminEditForm.total_online_seconds) || 0;
                            if (adminEditForm.tan_level !== "") patch.tan_level = parseInt(adminEditForm.tan_level) || 0;
                            patch.muted_until = adminEditForm.muted_until.trim() || null;
                            patch.name_color = adminEditForm.name_color;
                            patch.aura_color = adminEditForm.aura_color;
                            patch.bubble_color = adminEditForm.bubble_color;
                            if (adminEditForm.muted_until.trim()) {
                              globalChannelRef.current?.send({ type: "broadcast", event: "user_muted", payload: { user_id: adminEditTarget.id, muted_until: adminEditForm.muted_until.trim() } });
                            }
                            // Broadcast style update so target user sees changes in real-time
                            globalChannelRef.current?.send({ type: "broadcast", event: "user_style", payload: { user_id: adminEditTarget.id, name_color: adminEditForm.name_color, aura_color: adminEditForm.aura_color, bubble_color: adminEditForm.bubble_color } });
                            await supabase.from("profiles").update(patch).eq("id", adminEditTarget.id);
                            setAdminEditTarget(null);
                            // Refresh search results
                            if (adminSearchQuery) {
                              const { data } = await supabase.from("profiles").select("id, display_name, avatar_color, role, coins, xp, level, total_online_seconds, muted_until, is_banned, tan_level, name_color, aura_color").ilike("display_name", `%${adminSearchQuery}%`).limit(20);
                              setAdminSearchResults((data ?? []) as Profile[]);
                            }
                          }}
                          className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-[12px] font-bold text-white transition-colors"
                        >
                          Gem ændringer
                        </button>
                      </div>
                    )}

                    {/* Move modal */}
                    {adminMoveTarget && (
                      <div className="mx-3 mb-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[12px] font-bold text-blue-300">Flyt: {adminMoveTarget.display_name}</span>
                          <button onClick={() => setAdminMoveTarget(null)} className="text-slate-600 hover:text-slate-300"><X className="w-3 h-3" /></button>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-1.5">Flyt til felt (x, y)</p>
                        <div className="flex gap-1.5 mb-2">
                          <input value={adminMoveTile.gx} onChange={e => setAdminMoveTile(f => ({ ...f, gx: e.target.value }))} placeholder="X" className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1 text-[12px] text-slate-200 outline-none focus:border-blue-500/40" />
                          <input value={adminMoveTile.gy} onChange={e => setAdminMoveTile(f => ({ ...f, gy: e.target.value }))} placeholder="Y" className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1 text-[12px] text-slate-200 outline-none focus:border-blue-500/40" />
                          <button
                            onClick={() => {
                              const gx = parseInt(adminMoveTile.gx); const gy = parseInt(adminMoveTile.gy);
                              if (isNaN(gx) || isNaN(gy)) return;
                              channelRef.current?.send({ type: "broadcast", event: "admin_move", payload: { user_id: adminMoveTarget.user_id, gx, gy } });
                              setAdminMoveTarget(null);
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-[12px] text-white transition-colors"
                          >Flyt</button>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-1.5">Flyt til rum</p>
                        <select value={adminMoveRoom} onChange={e => setAdminMoveRoom(e.target.value)} className="w-full bg-[#0a1220] border border-white/[0.08] rounded-lg px-2 py-1 text-[12px] text-slate-300 outline-none mb-1.5">
                          <option value="">Vælg rum...</option>
                          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <button
                          onClick={() => {
                            if (!adminMoveRoom) return;
                            const r = rooms.find(x => x.id === adminMoveRoom);
                            if (!r) return;
                            globalChannelRef.current?.send({ type: "broadcast", event: "admin_room_switch", payload: { user_id: adminMoveTarget.user_id, room_id: r.id, room_name: r.name, cols: r.cols, rows: r.rows, room_type: r.room_type ?? "normal", theme_key: r.theme_key ?? "blue", floor_pattern: r.floor_pattern ?? "standard", owner_id: r.owner_id ?? null } });
                            setAdminMoveTarget(null);
                          }}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[12px] font-bold text-white transition-colors"
                        >Flyt til rum</button>
                      </div>
                    )}

                    {/* User list */}
                    <div className="flex-1 overflow-y-auto">
                      {(adminSearchQuery ? adminSearchResults : Array.from(globalUsers.values()).map(u => ({ id: u.user_id, display_name: u.display_name, avatar_color: u.color, role: "user", coins: 0, xp: 0, level: 0 } as Profile))).map(user => {
                        const isOnline = globalUsers.has(user.id);
                        const isMutedNow = !!(user.muted_until && new Date(user.muted_until) > new Date());
                        return (
                          <div key={user.id} className="px-3 py-2 border-b border-white/[0.03] hover:bg-white/[0.02]">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isOnline ? "#22c55e" : "#475569" }} />
                              <span className="text-[13px] font-semibold text-slate-200 flex-1 truncate">{user.display_name}</span>
                              {user.role === "admin" && <span className="text-[10px] text-violet-400 font-bold">MOD</span>}
                              {isMutedNow && <span className="text-[10px] text-amber-400">🔇</span>}
                              {user.is_banned && <span className="text-[10px] text-rose-400">BAN</span>}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {/* Kick — only if online in same room */}
                              {Array.from(users.keys()).includes(user.id) && (
                                <button onClick={() => channelRef.current?.send({ type: "broadcast", event: "kick", payload: { user_id: user.id, by_name: currentProfile.display_name } })} className="px-2 py-0.5 rounded-lg text-[11px] bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition-colors">Kick</button>
                              )}
                              {/* Ban/Unban */}
                              {user.is_banned
                                ? <button onClick={async () => { await supabase.from("profiles").update({ is_banned: false }).eq("id", user.id); setAdminSearchResults(r => r.map(x => x.id === user.id ? { ...x, is_banned: false } : x)); }} className="px-2 py-0.5 rounded-lg text-[11px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors">Fjern ban</button>
                                : <button onClick={async () => { if (!confirm(`Ban ${user.display_name}?`)) return; await supabase.from("profiles").update({ is_banned: true }).eq("id", user.id); setAdminSearchResults(r => r.map(x => x.id === user.id ? { ...x, is_banned: true } : x)); }} className="px-2 py-0.5 rounded-lg text-[11px] bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors">Ban</button>
                              }
                              {/* Mute */}
                              {isMutedNow
                                ? <button onClick={async () => { await supabase.from("profiles").update({ muted_until: null }).eq("id", user.id); globalChannelRef.current?.send({ type: "broadcast", event: "user_muted", payload: { user_id: user.id, muted_until: null } }); setAdminSearchResults(r => r.map(x => x.id === user.id ? { ...x, muted_until: null } : x)); }} className="px-2 py-0.5 rounded-lg text-[11px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors">Unmute</button>
                                : <button onClick={async () => { const until = new Date(Date.now() + 60 * 60000).toISOString(); await supabase.from("profiles").update({ muted_until: until }).eq("id", user.id); globalChannelRef.current?.send({ type: "broadcast", event: "user_muted", payload: { user_id: user.id, muted_until: until } }); setAdminSearchResults(r => r.map(x => x.id === user.id ? { ...x, muted_until: until } : x)); }} className="px-2 py-0.5 rounded-lg text-[11px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors">Mute 1t</button>
                              }
                              {/* Move */}
                              {isOnline && (
                                <button onClick={() => { setAdminMoveTarget({ user_id: user.id, display_name: user.display_name }); setAdminMoveTile({ gx: "", gy: "" }); setAdminMoveRoom(""); }} className="px-2 py-0.5 rounded-lg text-[11px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors">Flyt</button>
                              )}
                              {/* Edit */}
                              <button onClick={() => { setAdminEditTarget(user); setAdminEditForm({ xp: String(user.xp ?? ""), coins: String(user.coins ?? ""), total_online_seconds: String(user.total_online_seconds ?? ""), tan_level: String((user as Profile & { tan_level?: number }).tan_level ?? ""), muted_until: user.muted_until ?? "", name_color: user.name_color ?? null, aura_color: (user as Profile & { aura_color?: string | null }).aura_color ?? null, bubble_color: (user as Profile & { bubble_color?: string | null }).bubble_color ?? null }); }} className="px-2 py-0.5 rounded-lg text-[11px] bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 transition-colors">Rediger</button>
                            </div>
                          </div>
                        );
                      })}
                      {adminSearchQuery && adminSearchResults.length === 0 && <p className="text-[13px] text-slate-600 text-center mt-6">Ingen brugere fundet</p>}
                      {!adminSearchQuery && globalUsers.size === 0 && <p className="text-[13px] text-slate-600 text-center mt-6">Ingen online</p>}
                    </div>
                  </div>
                )}

                {/* ── Items tab ── */}
                {adminTab === "items" && (
                  <>
                    <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                      <span className="text-[12px] text-slate-400 font-semibold">Genstande i rum</span>
                      <button onClick={() => setCreateForm({ name: "", item_type: "flower" })} className="p-1 rounded text-slate-500 hover:text-emerald-400"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    {createForm && (
                      <div className="px-3 py-2 border-b border-white/[0.06] bg-violet-500/5 flex-shrink-0">
                        <p className="text-[12px] font-semibold text-slate-500 mb-1.5">Ny genstand</p>
                        <input autoFocus value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} onKeyDown={e => { if (e.key === "Enter") createItem(); if (e.key === "Escape") setCreateForm(null); }} placeholder="Navn..." className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[13px] text-slate-100 outline-none mb-1.5 focus:border-violet-500/50" />
                        <select value={createForm.item_type} onChange={e => setCreateForm({ ...createForm, item_type: e.target.value })} className="w-full bg-[#0a1220] border border-white/[0.08] rounded px-2 py-1 text-[13px] text-slate-300 outline-none mb-1.5">
                          {ITEM_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                        </select>
                        <div className="flex gap-1">
                          <button onClick={createItem} className="flex-1 py-1 bg-violet-600 hover:bg-violet-500 rounded text-[12px] text-white">Opret</button>
                          <button onClick={() => setCreateForm(null)} className="flex-1 py-1 bg-white/[0.06] hover:bg-white/[0.1] rounded text-[12px] text-slate-300">Annuller</button>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto py-1">
                      {items.length === 0 && <p className="text-[13px] text-slate-600 text-center mt-4">Ingen genstande</p>}
                      {items.map(item => {
                        const meta = ITEM_TYPES.find(t => t.type === item.item_type);
                        const loc = item.owner_id ? "Inventar" : item.gx !== null ? `(${item.gx},${item.gy})` : "?";
                        const scale = item.item_scale ?? 1;
                        return (
                          <div key={item.id} className="px-2 py-1.5 hover:bg-white/[0.03] group">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded bg-white/[0.05] flex items-center justify-center flex-shrink-0"><svg width="18" height="18" viewBox="-16 -16 32 32"><ItemSVG type={item.item_type} /></svg></div>
                              {editItem?.id === item.id
                                ? <input autoFocus value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} onBlur={() => saveItemName(item, editItem.name)} onKeyDown={e => { if (e.key === "Enter") saveItemName(item, editItem.name); if (e.key === "Escape") setEditItem(null); }} className="flex-1 bg-white/[0.06] border border-violet-500/50 rounded px-1 py-0.5 text-[13px] text-slate-100 outline-none" />
                                : <div className="flex-1 min-w-0"><p className="text-[13px] text-slate-300 truncate">{item.name}</p><p className="text-[11px] text-slate-600">{meta?.label} · {loc}</p></div>
                              }
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditItem(item)} className="p-0.5 text-slate-500 hover:text-blue-400"><Pencil className="w-2.5 h-2.5" /></button>
                                <button onClick={() => deleteItem(item.id)} className="p-0.5 text-slate-500 hover:text-rose-400"><Trash2 className="w-2.5 h-2.5" /></button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-1 pl-7">
                              <button onClick={() => updateItemScale(item, -0.2)} className="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400"><Minus className="w-2.5 h-2.5" /></button>
                              <span className="text-[11px] text-slate-500 w-8 text-center">{Math.round(scale * 100)}%</span>
                              <button onClick={() => updateItemScale(item, 0.2)} className="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400"><Plus className="w-2.5 h-2.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ── Bots tab ── */}
                {adminTab === "bots" && (
                  <>
                    <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                      <span className="text-[12px] text-slate-400 font-semibold">Bots i rum</span>
                      <button onClick={() => setCreateBotForm({ name: "", color: "#6366f1", message: "", moves_randomly: false, gives_clothing_id: "" })} className="p-1 rounded text-slate-500 hover:text-emerald-400"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    {createBotForm && (
                      <div className="px-3 py-2 border-b border-white/[0.06] bg-violet-500/5 flex-shrink-0">
                        <p className="text-[12px] font-semibold text-slate-500 mb-1.5">Ny bot</p>
                        <input autoFocus value={createBotForm.name} onChange={e => setCreateBotForm({ ...createBotForm, name: e.target.value })} onKeyDown={e => { if (e.key === "Escape") setCreateBotForm(null); }} placeholder="Navn..." className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[13px] text-slate-100 outline-none mb-1.5 focus:border-violet-500/50" />
                        <div className="flex items-center gap-2 mb-1.5">
                          <label className="text-[11px] text-slate-500">Farve</label>
                          <input type="color" value={createBotForm.color} onChange={e => setCreateBotForm({ ...createBotForm, color: e.target.value })} className="w-8 h-6 rounded cursor-pointer bg-transparent border border-white/[0.08]" />
                        </div>
                        <textarea value={createBotForm.message} onChange={e => setCreateBotForm({ ...createBotForm, message: e.target.value })} placeholder={"Beskeder (én per linje, valgfri)\nBrug {navn} for brugerens navn"} rows={3} className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[13px] text-slate-100 outline-none mb-1.5 focus:border-violet-500/50 resize-none" />
                        <div className="flex items-center gap-2 mb-1.5">
                          <input type="checkbox" id="bot-moves" checked={createBotForm.moves_randomly} onChange={e => setCreateBotForm({ ...createBotForm, moves_randomly: e.target.checked })} className="rounded" />
                          <label htmlFor="bot-moves" className="text-[12px] text-slate-400">Bevæger sig tilfældigt</label>
                        </div>
                        <select value={createBotForm.gives_clothing_id} onChange={e => setCreateBotForm({ ...createBotForm, gives_clothing_id: e.target.value })} className="w-full bg-[#0a1220] border border-white/[0.08] rounded px-2 py-1 text-[13px] text-slate-300 outline-none mb-1.5">
                          <option value="">Giver intet</option>
                          {clothingCatalog.map(c => <option key={c.id} value={c.id}>{c.name} ({CLOTHING_SLOTS.find(s => s.id === c.slot)?.label})</option>)}
                        </select>
                        <div className="flex gap-1">
                          <button onClick={createBot} className="flex-1 py-1 bg-violet-600 hover:bg-violet-500 rounded text-[12px] text-white">Opret</button>
                          <button onClick={() => setCreateBotForm(null)} className="flex-1 py-1 bg-white/[0.06] hover:bg-white/[0.1] rounded text-[12px] text-slate-300">Annuller</button>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto py-1">
                      {bots.length === 0 && <p className="text-[13px] text-slate-600 text-center mt-4">Ingen bots</p>}
                      {bots.map(bot => {
                        const givesItem = clothingCatalog.find(c => c.id === bot.gives_clothing_id);
                        return (
                          <div key={bot.id} className="px-2 py-1.5 hover:bg-white/[0.03] group flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: bot.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-slate-300 truncate">{bot.name}</p>
                              <p className="text-[11px] text-slate-600">{bot.moves_randomly ? "Bevæger sig · " : ""}{givesItem ? `🎁 ${givesItem.name}` : "Ingen gave"}</p>
                            </div>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setMovingBotId(bot.id)} className="p-1 text-slate-500 hover:text-blue-400" title="Flyt bot"><Bot className="w-2.5 h-2.5" /></button>
                              <button onClick={() => deleteBot(bot.id)} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 className="w-2.5 h-2.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ── Self tab ── */}
                {adminTab === "self" && (
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                    {/* Invisible mode */}
                    <div className="p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-slate-200">Usynlig tilstand</span>
                        <button
                          onClick={() => {
                            const next = !isInvisible;
                            setIsInvisible(next);
                            isInvisibleRef.current = next;
                            if (next) {
                              channelRef.current?.untrack();
                              globalChannelRef.current?.untrack();
                            } else {
                              const payload: PresenceUser = { user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, gx: myPosRef.current.gx, gy: myPosRef.current.gy, mood: myMoodRef.current, outfit: outfitRef.current, tan_level: tanLevelRef.current, name_color: nameColor, aura_color: auraColor, bubble_color: bubbleColor, invisible: false };
                              channelRef.current?.track(payload);
                              globalChannelRef.current?.track({ user_id: currentProfile.id, display_name: currentProfile.display_name, color: myColor, room_id: activeRoomId, room_name: activeRoomName });
                            }
                          }}
                          className={`relative w-10 h-5 rounded-full transition-colors ${isInvisible ? "bg-violet-600" : "bg-white/[0.12]"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isInvisible ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">{isInvisible ? "🔮 Du er usynlig — andre kan ikke se dig" : "Andre kan se dig i rummet"}</p>
                    </div>

                    {/* Name color */}
                    <div className="p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                      <p className="text-[13px] font-semibold text-slate-200 mb-2">Navn farve</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([["#ffffff", "Hvid"], ["#c4b5fd", "Lilla"], ["#f87171", "Rød"], ["#fbbf24", "Guld"], ["#34d399", "Grøn"], ["#38bdf8", "Cyan"], ["#fb923c", "Orange"], [null, "Standard"]] as [string | null, string][]).map(([color, label]) => (
                          <button
                            key={label}
                            onClick={async () => {
                              setNameColor(color);
                              await supabase.from("profiles").update({ name_color: color }).eq("id", currentProfile.id);
                              broadcastMove(myPosRef.current.gx, myPosRef.current.gy);
                            }}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${nameColor === color ? "border-white/40 bg-white/[0.12]" : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07]"}`}
                            style={{ color: color ?? "#94a3b8" }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2">Navn preview: <span style={{ color: nameColor ?? "white", fontWeight: 700 }}>{currentProfile.display_name}</span></p>
                    </div>

                    {/* Aura color */}
                    <div className="p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                      <p className="text-[13px] font-semibold text-slate-200 mb-2">Aura farve</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([["#c4b5fd", "Lilla"], ["#f87171", "Rød"], ["#fbbf24", "Guld"], ["#34d399", "Grøn"], ["#38bdf8", "Cyan"], ["#fb923c", "Orange"], ["#f472b6", "Pink"], [null, "Ingen"]] as [string | null, string][]).map(([color, label]) => (
                          <button
                            key={label}
                            onClick={async () => {
                              setAuraColor(color);
                              await supabase.from("profiles").update({ aura_color: color }).eq("id", currentProfile.id);
                              broadcastMove(myPosRef.current.gx, myPosRef.current.gy);
                            }}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${auraColor === color ? "border-white/40 bg-white/[0.12]" : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07]"}`}
                            style={{ color: color ?? "#94a3b8" }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {auraColor && <p className="text-[11px] text-slate-500 mt-2">Aura aktiv — synlig for alle i rummet</p>}
                    </div>

                    {/* Bubble color */}
                    <div className="p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                      <p className="text-[13px] font-semibold text-slate-200 mb-2">Boble farve</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([["#ffffff", "Hvid"], ["#c4b5fd", "Lilla"], ["#86efac", "Grøn"], ["#93c5fd", "Blå"], ["#fde68a", "Gul"], ["#fca5a5", "Rød"], ["#f9a8d4", "Pink"], [null, "Standard"]] as [string | null, string][]).map(([color, label]) => (
                          <button
                            key={label}
                            onClick={async () => {
                              setBubbleColor(color);
                              await supabase.from("profiles").update({ bubble_color: color }).eq("id", currentProfile.id);
                            }}
                            className={`py-1.5 rounded-lg text-[11px] font-bold transition-all border ${bubbleColor === color ? "border-white/40 ring-1 ring-white/20" : "border-white/[0.06] hover:border-white/20"}`}
                            style={{ backgroundColor: color ?? "rgba(255,255,255,0.05)", color: color && ["#ffffff","#86efac","#93c5fd","#fde68a","#fca5a5","#f9a8d4"].includes(color) ? "#111" : "#e2e8f0" }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Profile panel */}
            {/* Settings panel */}
            {rightPanel === "settings" && (
              <>
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60 flex-shrink-0">
                  <span className="text-[13px] font-bold text-slate-300 tracking-wide">Indstillinger</span>
                  <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
                {/* Tabs */}
                <div className="flex border-b border-white/[0.06] flex-shrink-0">
                  {(["shop", "profil"] as const).map(tab => (
                    <button key={tab} onClick={() => setSettingsTab(tab)} className={`flex-1 py-2 text-[13px] font-semibold capitalize transition-colors ${settingsTab === tab ? "text-violet-300 border-b-2 border-violet-500" : "text-slate-500 hover:text-slate-300"}`}>
                      {tab === "shop" ? "🛒 Butik" : "👤 Profil"}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {settingsTab === "profil" && (
                    <>
                      <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Rigtigt navn</p>
                      <form onSubmit={async e => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem("rn") as HTMLInputElement).value.trim(); if (!v) return; await supabase.from("profiles").update({ real_name: v }).eq("id", currentProfile.id); }} className="space-y-2">
                        <input name="rn" defaultValue={(currentProfile as Profile & { real_name?: string }).real_name ?? ""} placeholder="Dit rigtige navn..." maxLength={60} className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-3 py-1.5 text-[14px] text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500/50 transition-all" />
                        <button type="submit" className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-[13px] text-white font-semibold transition-colors">Gem navn</button>
                      </form>
                      <div className="border-t border-white/[0.06] pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Alien farve</p>
                          <span className="text-[11px] font-bold text-amber-400">25 🪙</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {/* Default / standard gray */}
                          <button
                            disabled={myColor === "none" || myColor === ""}
                            onClick={async () => {
                              if (myColor === "none" || myColor === "") return;
                              if (coinsRef.current < 25) return;
                              const nc = coinsRef.current - 25;
                              coinsRef.current = nc; setCoins(nc);
                              setMyColor("none"); currentProfile.avatar_color = "none";
                              await supabase.from("profiles").update({ avatar_color: "none", coins: nc }).eq("id", currentProfile.id);
                            }}
                            className="w-7 h-7 rounded-full transition-all border-2 flex-shrink-0 disabled:cursor-default flex items-center justify-center text-[10px] font-bold"
                            style={{ background: "linear-gradient(135deg,#6b7280,#9ca3af)", borderColor: (myColor === "none" || myColor === "") ? "white" : "transparent", boxShadow: (myColor === "none" || myColor === "") ? "0 0 8px #9ca3af" : "none", opacity: coins < 25 && myColor !== "none" ? 0.4 : 1 }}
                            title="Standard (grå)"
                          />
                          {AVATAR_TINT_COLORS.map(c => (
                            <button
                              key={c}
                              disabled={myColor === c}
                              onClick={async () => {
                                if (myColor === c) return;
                                if (coinsRef.current < 25) return;
                                const nc = coinsRef.current - 25;
                                coinsRef.current = nc; setCoins(nc);
                                setMyColor(c); currentProfile.avatar_color = c;
                                await supabase.from("profiles").update({ avatar_color: c, coins: nc }).eq("id", currentProfile.id);
                              }}
                              className="w-7 h-7 rounded-full transition-all border-2 flex-shrink-0 disabled:cursor-default"
                              style={{ backgroundColor: c, borderColor: myColor === c ? "white" : "transparent", boxShadow: myColor === c ? `0 0 8px ${c}` : "none", opacity: coins < 25 && myColor !== c ? 0.4 : 1 }}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1.5">{coins < 25 ? "Ikke nok mønter" : "Klik en farve for at skifte · 25 🪙 · Grå = standard"}</p>
                      </div>
                    </>
                  )}
                  {settingsTab === "shop" && (
                    <>
                      {/* Name change */}
                      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05] space-y-2">
                        <div className="flex items-center justify-between">
                          <div><p className="text-[14px] font-bold text-slate-200">Navneændring</p><p className="text-[12px] text-slate-500">Skift dit visningsnavn</p></div>
                          <span className="text-[13px] font-bold text-amber-400">500 🪙</span>
                        </div>
                        <form onSubmit={async e => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem("dn") as HTMLInputElement).value.trim(); if (!v || coins < 500) return; const nc = coins - 500; coinsRef.current = nc; setCoins(nc); await supabase.from("profiles").update({ display_name: v, coins: nc }).eq("id", currentProfile.id); currentProfile.display_name = v; }} className="flex gap-2">
                          <input name="dn" placeholder="Nyt navn..." maxLength={50} className="flex-1 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[13px] text-slate-200 placeholder-slate-600 outline-none focus:border-amber-500/50 transition-all" />
                          <button type="submit" disabled={coins < 500} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg text-[13px] text-white font-semibold transition-colors flex-shrink-0">Køb</button>
                        </form>
                      </div>
                      {/* Divider */}
                      <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wide pt-1">🚀 Rumskibe</p>
                      {mySpaceship ? (
                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-violet-400" />
                            <div><p className="text-[14px] font-bold text-violet-300">{mySpaceship.name}</p><p className="text-[12px] text-slate-500">Dit rumskib · {mySpaceship.cols}×{mySpaceship.rows} tiles</p></div>
                          </div>
                          <button onClick={() => switchRoom(mySpaceship.id, mySpaceship.name, mySpaceship.cols, mySpaceship.rows, "spaceship", mySpaceship.theme_key, mySpaceship.floor_pattern, mySpaceship.owner_id)} className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-[13px] text-white font-semibold transition-colors">Gå til mit rumskib</button>
                          <div className="border-t border-white/[0.06] pt-2.5 mt-1">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Adgangskode</p>
                            <form onSubmit={async e => {
                              e.preventDefault();
                              const v = (e.currentTarget.elements.namedItem("pc") as HTMLInputElement).value.trim();
                              await supabase.from("chat_rooms").update({ spaceship_passcode: v || null }).eq("id", mySpaceship!.id);
                              setMySpaceship(prev => prev ? { ...prev, spaceship_passcode: v || null } : prev);
                              setRooms(prev => prev.map(r => r.id === mySpaceship!.id ? { ...r, spaceship_passcode: v || null } : r));
                            }} className="flex gap-1.5">
                              <input name="pc" type="text" defaultValue={mySpaceship.spaceship_passcode ?? ""} placeholder="Ingen kode sat..." maxLength={20} className="flex-1 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[13px] text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500/50 transition-all" />
                              <button type="submit" className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-[12px] text-white font-semibold transition-colors flex-shrink-0">Gem</button>
                            </form>
                            <p className="text-[11px] text-slate-600 mt-1">{mySpaceship.spaceship_passcode ? "🔒 Kodelåst" : "🔓 Kræver ejeracceptering"}</p>
                          </div>
                        </div>
                      ) : (
                        SPACESHIP_VARIANTS.map(v => (
                          <div key={v.id} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05] space-y-2">
                            <div className="flex items-center justify-between">
                              <div><p className="text-[14px] font-bold text-slate-200">{v.emoji} {v.name}</p><p className="text-[12px] text-slate-500">{v.desc} · {v.cols}×{v.rows}</p></div>
                              <span className="text-[13px] font-bold text-amber-400 flex-shrink-0">{v.price.toLocaleString()} 🪙</span>
                            </div>
                            <button disabled={coins < v.price} onClick={async () => {
                              if (coins < v.price) return;
                              const nc = coins - v.price;
                              coinsRef.current = nc; setCoins(nc);
                              const roomName = `${currentProfile.display_name}s rumskib`;
                              const { data: newRoom } = await supabase.from("chat_rooms").insert({ name: roomName, cols: v.cols, rows: v.rows, room_type: "spaceship", theme_key: v.theme, floor_pattern: "grid", owner_id: currentProfile.id, spaceship_design: v.id }).select("*").single();
                              await supabase.from("profiles").update({ coins: nc }).eq("id", currentProfile.id);
                              if (newRoom) { setMySpaceship(newRoom as ChatRoom); setRooms(prev => [...prev, newRoom as ChatRoom]); }
                            }} className="w-full py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 rounded-lg text-[13px] text-white font-semibold transition-all">
                              {coins < v.price ? `Mangler ${(v.price - coins).toLocaleString()} 🪙` : "Køb rumskib"}
                            </button>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* Other user profile panel */}
            {rightPanel === "userprofile" && profileView && (() => {
              const isMutedNow = !!(profileView.muted_until && new Date(profileView.muted_until) > new Date());
              const pvIsAdmin = profileView.role === "admin";
              const pvEarned = allAchievements.filter(a => profileViewAchievements.has(a.id));
              const updatePV = async (patch: Partial<Profile>) => {
                const { data } = await supabase.from("profiles").update(patch).eq("id", profileView.id).select().single();
                if (data) setProfileView(data as Profile);
                // Broadcast mute changes so all clients update in real time
                if ("muted_until" in patch) {
                  globalChannelRef.current?.send({ type: "broadcast", event: "user_muted", payload: { user_id: profileView.id, muted_until: patch.muted_until ?? null } });
                }
              };
              return (
                <>
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60 flex-shrink-0">
                    <button onClick={() => setRightPanel("hidden")} className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0 flex items-center gap-1.5 text-[12px]">← Tilbage</button>
                    <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </div>

                  {/* Banner + avatar */}
                  <div className="flex-shrink-0 relative">
                    <div className="h-16 w-full" style={{ background: pvIsAdmin ? "linear-gradient(135deg,#1e0a3c,#2d1060,#1a0a2e)" : "linear-gradient(135deg,#050d1f,#0a1628,#060e1c)" }} />
                    {pvIsAdmin && <div className="absolute inset-0 h-16 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg,#7c3aed 0,#7c3aed 1px,transparent 0,transparent 50%)", backgroundSize: "10px 10px" }} />}
                    <div className="absolute top-3 left-4 flex items-center gap-1.5">
                      {pvIsAdmin && (
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-lg" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#e0c8ff", boxShadow: "0 0 12px rgba(124,58,237,0.5)" }}>🛡 ADMIN</span>
                      )}
                      {profileView.is_banned && <span className="text-[10px] font-bold uppercase tracking-wide text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">Udelukket</span>}
                      {isMutedNow && <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">🔇 Muttet</span>}
                    </div>
                    <div className="flex flex-col items-center -mt-8 pb-3">
                      {(() => {
                        const pvOutfit = profileView.id === currentProfile.id ? myOutfit : (users.get(profileView.id)?.outfit ?? {});
                        const hasOutfit = Object.keys(pvOutfit).length > 0;
                        return (
                          <div className="rounded-full border-2 flex items-center justify-center overflow-visible" style={{ borderColor: pvIsAdmin ? "#7c3aed" : "#1e293b", background: "#07101c", boxShadow: pvIsAdmin ? "0 0 16px rgba(124,58,237,0.4)" : "0 4px 16px rgba(0,0,0,0.6)", width: hasOutfit ? 72 : 64, height: hasOutfit ? 76 : 64 }}>
                            <svg width={hasOutfit ? 60 : 48} height={hasOutfit ? 64 : 50} viewBox="-14 -30 28 50" style={{ overflow: "visible" }}>
                              <PersonAvatar color={profileView.avatar_color ?? "#8b5cf6"} glow={pvIsAdmin} />
                              {hasOutfit && <ClothingOverlay outfit={pvOutfit} catalog={clothingCatalog} />}
                            </svg>
                          </div>
                        );
                      })()}
                      <p className="text-[16px] font-black text-white mt-2 tracking-tight">{profileView.display_name}</p>
                      <p className="text-[12px] text-slate-500">@{profileView.username}</p>
                      {/* Quick stats */}
                      <div className="flex items-center gap-3 mt-2">
                        {profileView.level != null && <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20"><span className="text-[11px] font-black text-violet-300">LV {profileView.level}</span></div>}
                        {profileView.coins != null && <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"><span className="text-sm">🪙</span><span className="text-[11px] font-black text-amber-300">{profileView.coins.toLocaleString()}</span></div>}
                        {profileView.xp != null && <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07]"><span className="text-[11px] font-semibold text-slate-400">{profileView.xp} XP</span></div>}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {/* XP bar */}
                    {profileView.xp != null && (() => {
                      const pvXp = profileView.xp;
                      const pvLv = levelFromXp(pvXp);
                      const pvInLv = xpInCurrentLevel(pvXp);
                      const pvNeeded = xpForNextLevel(pvXp);
                      const pct = pvNeeded > 0 ? Math.min(100, pvInLv / pvNeeded * 100) : 100;
                      return (
                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[12px] font-bold text-violet-300">Niveau {pvLv}</span>
                            <span className="text-[12px] text-slate-500 tabular-nums">{pvInLv} / {pvNeeded > 0 ? pvNeeded : "MAX"} XP</span>
                          </div>
                          <div className="w-full bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">{pvNeeded > 0 ? `${pvNeeded - pvInLv} XP til niveau ${pvLv + 1}` : "Max niveau nået!"}</p>
                        </div>
                      );
                    })()}

                    {/* Achievements */}
                    {pvEarned.length > 0 && (
                      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Bedrifter ({pvEarned.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {pvEarned.map(a => (
                            <div key={a.id} title={`${a.name}: ${a.description}`}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-default hover:scale-105 transition-transform"
                              style={{ background: a.badge_color + "15", borderColor: a.badge_color + "35" }}>
                              <span className="text-base leading-none">{a.badge_emoji}</span>
                              <span className="text-[11px] font-semibold" style={{ color: a.badge_color }}>{a.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    {(profileView.total_online_seconds != null || profileView.bio) && (
                      <div className="bg-white/[0.03] rounded-xl border border-white/[0.05] overflow-hidden">
                        <div className="px-3 py-2 border-b border-white/[0.05] bg-white/[0.02]">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Info</p>
                        </div>
                        <div className="p-3 space-y-2">
                          {profileView.total_online_seconds != null && profileView.total_online_seconds > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] text-slate-400">⏱ Online tid</span>
                              <span className="text-[13px] text-slate-200 font-medium">{(() => { const h = Math.floor(profileView.total_online_seconds! / 3600); const m = Math.floor((profileView.total_online_seconds! % 3600) / 60); return h > 0 ? `${h}t ${m}m` : `${m}m`; })()}</span>
                            </div>
                          )}
                          {profileView.bio && <p className="text-[13px] text-slate-400 leading-relaxed pt-1 border-t border-white/[0.05]">{profileView.bio}</p>}
                        </div>
                      </div>
                    )}

                    {/* Send privat besked */}
                    {profileView.id !== currentProfile.id && (
                      <button
                        onClick={() => startDmWith(profileView.id, profileView.display_name, profileView.avatar_color ?? "#8b5cf6")}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors border border-violet-500/40"
                      >
                        <Mail className="w-4 h-4" /> Send privat besked
                      </button>
                    )}

                    {/* Admin tools */}
                    {isAdmin && (
                      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                        <div className="px-3 py-2 border-b border-white/[0.05] bg-violet-500/[0.04]">
                          <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest">🛡 Moderator</p>
                        </div>
                        <div className="p-2 space-y-1.5">
                          {isMutedNow ? (
                            <button onClick={() => updatePV({ muted_until: null })} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors">
                              <Volume2 className="w-3.5 h-3.5" /> Fjern mute
                            </button>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5">
                              {([["15 min", 15], ["1 time", 60], ["24 timer", 1440], ["Permanent", 5256000]] as [string, number][]).map(([l, m]) => (
                                <button key={l} onClick={() => { const until = new Date(Date.now() + m * 60000).toISOString(); updatePV({ muted_until: until }); }} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"><VolumeX className="w-3 h-3 flex-shrink-0" />{l}</button>
                              ))}
                            </div>
                          )}
                          {profileView.is_banned
                            ? <button onClick={() => updatePV({ is_banned: false })} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"><UserCheck className="w-3.5 h-3.5" /> Fjern udelukkelse</button>
                            : <button onClick={() => { if (confirm(`Udeluk ${profileView.display_name}?`)) updatePV({ is_banned: true }); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"><Ban className="w-3.5 h-3.5" /> Udeluk bruger</button>
                          }
                          {pvIsAdmin
                            ? <button onClick={() => { if (confirm(`Fjern admin fra ${profileView.display_name}?`)) updatePV({ role: "user" }); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-slate-400 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"><ShieldOff className="w-3.5 h-3.5" /> Fjern moderator</button>
                            : <button onClick={() => { if (confirm(`Gør ${profileView.display_name} til moderator?`)) updatePV({ role: "admin" }); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-colors"><Shield className="w-3.5 h-3.5" /> Gør til moderator</button>
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {rightPanel === "profile" && (() => {
              const earnedAchievements = allAchievements.filter(a => myAchievements.has(a.id));
              return (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60 flex-shrink-0">
                  <span className="text-[13px] font-bold text-slate-300 tracking-wide">Min profil</span>
                  <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>

                {/* Banner + avatar */}
                <div className="flex-shrink-0 relative">
                  <div className="h-16 w-full" style={{ background: isAdmin ? "linear-gradient(135deg,#1e0a3c,#2d1060,#1a0a2e)" : "linear-gradient(135deg,#050d1f,#0a1628,#060e1c)" }} />
                  {isAdmin && <div className="absolute inset-0 h-16 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg,#7c3aed 0,#7c3aed 1px,transparent 0,transparent 50%)", backgroundSize: "10px 10px" }} />}
                  <div className="absolute top-3 left-4">
                    {isAdmin
                      ? <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-lg" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#e0c8ff", boxShadow: "0 0 12px rgba(124,58,237,0.5)" }}>🛡 ADMIN</span>
                      : <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 bg-white/[0.05] px-2 py-1 rounded-lg border border-white/[0.06]">Bruger</span>
                    }
                  </div>
                  {/* Avatar circle */}
                  <div className="flex flex-col items-center -mt-8 pb-3">
                    <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center" style={{ borderColor: isAdmin ? "#7c3aed" : "#1e293b", background: "#07101c", boxShadow: isAdmin ? "0 0 16px rgba(124,58,237,0.4)" : "0 4px 16px rgba(0,0,0,0.6)" }}>
                      <svg width="48" height="50" viewBox="-14 -30 28 50">
                        <PersonAvatar color={myColor} glow={isAdmin} mood={myMood} />
                        {Object.keys(myOutfit).length > 0 && <ClothingOverlay outfit={myOutfit} catalog={clothingCatalog} />}
                      </svg>
                    </div>
                    <p className="text-[16px] font-black text-white mt-2 tracking-tight">{currentProfile.display_name}</p>
                    <p className="text-[12px] text-slate-500">@{currentProfile.username}</p>
                    {/* Quick stats row */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                        <span className="text-[11px] font-black text-violet-300">LV {level}</span>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <span className="text-sm leading-none">🪙</span>
                        <span className="text-[11px] font-black text-amber-300">{coins.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07]">
                        <span className="text-[11px] font-semibold text-slate-400">{xp} XP</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {/* XP Progress */}
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-bold text-violet-300">Niveau {level}</span>
                      <span className="text-[12px] text-slate-500 tabular-nums">{xp % 100} / 100 XP</span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500" style={{ width: `${xp % 100}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{100 - (xp % 100)} XP til niveau {level + 1}</p>
                  </div>

                  {/* Achievements/badges */}
                  {earnedAchievements.length > 0 && (
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Bedrifter ({earnedAchievements.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {earnedAchievements.map(a => (
                          <div key={a.id} title={`${a.name}: ${a.description}`}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-default hover:scale-105"
                            style={{ background: a.badge_color + "15", borderColor: a.badge_color + "35" }}>
                            <span className="text-base leading-none">{a.badge_emoji}</span>
                            <span className="text-[11px] font-semibold" style={{ color: a.badge_color }}>{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity */}
                  <div className="bg-white/[0.03] rounded-xl border border-white/[0.05] overflow-hidden">
                    <div className="px-3 py-2 border-b border-white/[0.05] bg-white/[0.02]">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Aktivitet</p>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-slate-400">⏱ Total online</span>
                        <span className="text-[13px] text-slate-200 font-medium tabular-nums">{(() => { const h = Math.floor(totalSeconds / 3600); const m = Math.floor((totalSeconds % 3600) / 60); return h > 0 ? `${h}t ${m}m` : `${m}m`; })()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-slate-400">💬 Beskeder</span>
                        <span className="text-[13px] text-slate-200 font-medium tabular-nums">{messageCountRef.current}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-slate-400">🪙 Næste bonus om</span>
                        <span className="text-[13px] text-emerald-400 font-medium tabular-nums">{(() => { const m = Math.floor(timeToNextHour / 60); const s = timeToNextHour % 60; return `${m}:${String(s).padStart(2, "0")}`; })()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Solarie */}
                  {tanLevel > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-amber-300 font-semibold">☀️ {TAN_LEVELS[tanLevel]!.label}</span>
                        <div className="flex gap-0.5">
                          {TAN_LEVELS.slice(1).map((t, i) => (
                            <div key={i + 1} className="w-2.5 h-2.5 rounded-full border border-amber-800/50"
                              style={{ backgroundColor: (i + 1) <= tanLevel ? t!.color : "rgba(255,255,255,0.06)" }} />
                          ))}
                        </div>
                      </div>
                      {tanExpiresAt && <p className="text-[11px] text-amber-700">Forsvinder om {Math.round((new Date(tanExpiresAt).getTime() - Date.now()) / 3600000)}t</p>}
                    </div>
                  )}
                </div>
              </>
              );
            })()}

            {/* Chat log */}
            {rightPanel === "chatlog" && (
              <>
                <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60">
                  <span className="text-[13px] font-bold text-slate-300 tracking-wide">Chatlog</span>
                  <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div ref={chatLogRef} className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5">
                  {logMessages.length === 0 && <p className="text-[13px] text-slate-600 text-center mt-4">Ingen beskeder endnu</p>}
                  {logMessages.map(msg => {
                    const p = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
                    const isMe = msg.user_id === currentProfile.id;
                    return (
                      <div key={msg.id} className="text-[13px] leading-snug">
                        <span className="font-semibold" style={{ color: p?.avatar_color ?? "#8b5cf6" }}>{isMe ? "Du" : (p?.display_name ?? "?")}: </span>
                        <span className="text-slate-300 break-words">{msg.content}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Wardrobe panel */}
            {rightPanel === "wardrobe" && (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-violet-400" />
                    <span className="text-[14px] font-bold text-slate-200 tracking-wide">Garderobe</span>
                    <span className="text-[11px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">{Object.keys(myOutfit).length}/{CLOTHING_SLOTS.length} udstyret</span>
                  </div>
                  <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>

                {/* Two-column body: avatar left, slot list right */}
                <div className="flex flex-shrink-0 border-b border-white/[0.06]" style={{ background: "radial-gradient(ellipse at 30% 80%,rgba(139,92,246,0.07) 0%,transparent 70%)" }}>
                  {/* Avatar */}
                  <div className="flex flex-col items-center justify-center px-4 py-4 gap-1" style={{ width: 140 }}>
                    <svg width="110" height="130" viewBox="-34 -60 68 110" style={{ overflow: "visible" }}>
                      <ellipse cx="0" cy="42" rx="18" ry="5" fill="rgba(0,0,0,0.35)" />
                      <g transform="scale(2.0)">
                        <PersonAvatar color={myColor} glow={false} mood="happy" />
                        {Object.keys(previewOutfit).length > 0 && <ClothingOverlay outfit={previewOutfit} catalog={clothingCatalog} />}
                      </g>
                    </svg>
                    <p className="text-[13px] font-semibold text-slate-300 truncate max-w-[120px] text-center">{currentProfile.display_name}</p>
                    <p className="text-[12px] text-violet-400 h-4 truncate max-w-[120px] text-center">{wardrobePreviewId ? (clothingCatalog.find(c => c.id === wardrobePreviewId)?.name ?? "\u00a0") : "\u00a0"}</p>
                  </div>
                  {/* Slot list */}
                  <div className="flex-1 flex flex-col justify-center py-3 pr-4 gap-0.5 overflow-y-auto" style={{ maxHeight: 210 }}>
                    {CLOTHING_SLOTS.map(slot => {
                      const equippedId = myOutfit[slot.id];
                      const equippedItem = equippedId ? clothingCatalog.find(c => c.id === equippedId) : null;
                      const isActive = wardrobeActiveSlot === slot.id;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => { setWardrobeActiveSlot(s => s === slot.id ? null : slot.id); setWardrobePreviewId(null); }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-left ${isActive ? "bg-violet-500/15 border border-violet-500/30" : "hover:bg-white/[0.04] border border-transparent"}`}
                        >
                          <span className="text-[15px] leading-none flex-shrink-0">{slot.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-semibold truncate ${equippedItem ? (isActive ? "text-violet-300" : "text-slate-300") : "text-slate-600"}`}>
                              {equippedItem ? equippedItem.name : <span className="italic">{slot.label}</span>}
                            </p>
                          </div>
                          {equippedItem && (
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: equippedItem.color }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category tabs */}
                <div className="flex-shrink-0 flex border-b border-white/[0.06] bg-[#060c18]/60 overflow-x-auto">
                  {CLOTHING_SLOTS.map(slot => {
                    const isActive = wardrobeActiveSlot === slot.id;
                    const hasOwned = myWardrobe.some(w => clothingCatalog.find(c => c.id === w.clothing_id)?.slot === slot.id);
                    return (
                      <button
                        key={slot.id}
                        onClick={() => { setWardrobeActiveSlot(s => s === slot.id ? null : slot.id); setWardrobePreviewId(null); }}
                        className={`relative flex flex-col items-center gap-1 px-4 py-3 transition-all flex-shrink-0 ${isActive ? "text-violet-300" : "text-slate-600 hover:text-slate-400"}`}
                      >
                        <span className="text-lg leading-none">{slot.emoji}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{slot.label}</span>
                        {isActive && <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-full bg-gradient-to-r from-violet-500 to-indigo-400" />}
                        {hasOwned && !isActive && <div className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-violet-500 opacity-70" />}
                      </button>
                    );
                  })}
                </div>

                {/* Item grid */}
                <div className="flex-1 overflow-y-auto p-4">
                  {!wardrobeActiveSlot && (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                      <Shirt className="w-10 h-10 text-slate-700" />
                      <p className="text-[14px] text-slate-500 max-w-[220px]">
                        {myWardrobe.length === 0 ? "Ingen tøj endnu. Find en bot med 🎁 for at få tøj." : "Vælg en kategori ovenfor for at se dit tøj"}
                      </p>
                    </div>
                  )}
                  {wardrobeActiveSlot && (() => {
                    const slotItems = myWardrobe
                      .map(w => ({ w, item: clothingCatalog.find(c => c.id === w.clothing_id) }))
                      .filter(({ item }) => item?.slot === wardrobeActiveSlot);
                    if (slotItems.length === 0) {
                      return (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                          <p className="text-[14px] text-slate-600">Intet tøj i denne kategori endnu.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {slotItems.map(({ w, item }) => item && (
                          <button
                            key={w.id}
                            className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all cursor-pointer ${
                              w.equipped
                                ? "border-teal-500/50 bg-teal-500/[0.08] shadow-[0_0_20px_rgba(20,184,166,0.12)]"
                                : wardrobePreviewId === item.id
                                ? "border-violet-500/40 bg-violet-500/[0.08]"
                                : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14]"
                            }`}
                            onMouseEnter={() => setWardrobePreviewId(item.id)}
                            onMouseLeave={() => setWardrobePreviewId(null)}
                            onClick={() => w.equipped ? unequip(w.clothing_id) : equip(w.clothing_id)}
                          >
                            {w.equipped && (
                              <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center shadow-[0_0_8px_rgba(20,184,166,0.5)]">
                                <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </div>
                            )}
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${item.color}33,${item.color}11)`, border: `1.5px solid ${item.color}55` }}>
                              <div className="w-9 h-9 rounded-xl" style={{ backgroundColor: item.color, boxShadow: `0 4px 16px ${item.color}70` }} />
                            </div>
                            <span className={`text-[13px] font-semibold text-center leading-tight w-full ${w.equipped ? "text-teal-300" : "text-slate-400"}`}>{item.name}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Achievements panel */}
            {rightPanel === "achievements" && (() => {
              const onlineHours = Math.floor(totalSeconds / 3600);
              const progressMap: Record<string, { cur: number; max: number } | null> = {
                first_message:   { cur: Math.min(messageCountState, 1),    max: 1    },
                messages_50:     { cur: Math.min(messageCountState, 50),   max: 50   },
                messages_200:    { cur: Math.min(messageCountState, 200),  max: 200  },
                messages_1000:   { cur: Math.min(messageCountState, 1000), max: 1000 },
                level_5:         { cur: Math.min(level, 5),    max: 5  },
                level_10:        { cur: Math.min(level, 10),   max: 10 },
                level_20:        { cur: Math.min(level, 20),   max: 20 },
                login_streak_7:  { cur: Math.min(loginStreak, 7),   max: 7  },
                login_streak_30: { cur: Math.min(loginStreak, 30),  max: 30 },
                own_clothing_1:  { cur: Math.min(myWardrobe.length, 1), max: 1 },
                solarie_1:       { cur: Math.min(tanLevel, 1), max: 1 },
                online_10h:      { cur: Math.min(onlineHours, 10),  max: 10  },
                online_100h:     { cur: Math.min(onlineHours, 100), max: 100 },
                collect_5_items: { cur: Math.min(myInventory.length, 5), max: 5 },
              };
              return (
              <>
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60 flex-shrink-0">
                  <div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" /><span className="text-[14px] font-bold text-slate-200 tracking-wide">Bedrifter</span><span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">{myAchievements.size}/{allAchievements.length}</span></div>
                  <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {allAchievements.map(a => {
                    const earned = myAchievements.has(a.id);
                    const prog = progressMap[a.id] ?? null;
                    const pct = prog ? Math.round((prog.cur / prog.max) * 100) : 0;
                    return (
                      <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${earned ? "border-white/[0.08] bg-white/[0.03]" : "border-white/[0.04] bg-white/[0.01]"}`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: earned ? a.badge_color + "22" : "rgba(255,255,255,0.03)", border: `1.5px solid ${earned ? a.badge_color + "44" : "rgba(255,255,255,0.06)"}` }}>
                          {earned ? a.badge_emoji : "🔒"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-[13px] font-bold truncate`} style={{ color: earned ? a.badge_color : "#64748b" }}>{a.name}</p>
                            {earned
                              ? <span className="text-[10px] text-emerald-400 font-bold flex-shrink-0">✓ Opnået</span>
                              : prog && <span className="text-[10px] text-slate-500 font-bold flex-shrink-0 tabular-nums">{prog.cur}/{prog.max}</span>
                            }
                          </div>
                          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{a.description}</p>
                          {/* Progress bar */}
                          {prog && (
                            <div className="mt-1.5 w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, background: earned ? a.badge_color : `${a.badge_color}88` }}
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            {a.reward_coins > 0 && <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">+{a.reward_coins} 🪙</span>}
                            {a.reward_xp > 0 && <span className="text-[11px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">+{a.reward_xp} XP</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
              );
            })()}

            {/* DM conversations list */}
            {rightPanel === "dms" && (
              <>
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#030912]/60 flex-shrink-0">
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-violet-400" /><span className="text-[14px] font-bold text-slate-200 tracking-wide">Beskeder</span>{dmUnread > 0 && <span className="text-[11px] font-bold text-white bg-violet-500 px-1.5 py-0.5 rounded-full">{dmUnread}</span>}</div>
                  <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {dmConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                      <Mail className="w-10 h-10 text-slate-700" />
                      <p className="text-[14px] text-slate-500">Ingen samtaler endnu</p>
                      <p className="text-[12px] text-slate-600">Højreklik på en bruger og vælg "Send privat besked" for at starte.</p>
                    </div>
                  ) : dmConversations.map(c => (
                    <div key={c.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] border-b border-white/[0.04] transition-colors">
                      {/* Mini avatar figure */}
                      <button onClick={() => openDmConversation(c.id)} className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: c.partner_color + "22", border: `1.5px solid ${c.partner_color}55` }}>
                          <svg width="32" height="34" viewBox="-14 -30 28 50" style={{ overflow: "visible" }}>
                            <PersonAvatar color={c.partner_color} glow={false} />
                          </svg>
                        </div>
                        {c.unread_count > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{c.unread_count}</span>}
                      </button>
                      {/* Text */}
                      <button onClick={() => openDmConversation(c.id)} className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-semibold text-slate-200 truncate">{c.partner_name}</p>
                          <p className="text-[11px] text-slate-600 flex-shrink-0 ml-2">{new Date(c.last_message_at).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <p className={`text-[12px] truncate mt-0.5 ${c.unread_count > 0 ? "text-slate-300 font-medium" : "text-slate-600"}`}>{c.last_preview || "Start en samtale..."}</p>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={async () => {
                          if (!confirm(`Slet samtale med ${c.partner_name}?`)) return;
                          await supabase.from("private_conversations").delete().eq("id", c.id);
                          setDmConversations(prev => prev.filter(x => x.id !== c.id));
                          if (activeDmConvId === c.id) { setActiveDmConvId(null); setDmMessages([]); setRightPanel("dms"); }
                          setDmUnread(prev => Math.max(0, prev - c.unread_count));
                        }}
                        className="flex-shrink-0 p-1.5 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Slet samtale"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* DM chat */}
            {rightPanel === "dm_chat" && activeDmConvId && (() => {
              const conv = dmConversations.find(c => c.id === activeDmConvId);
              // Mini avatar renderer used in messages
              const MiniAvatar = ({ color, outfit, onClick }: { color: string; outfit: Record<string, string>; onClick?: () => void }) => (
                <button
                  onClick={onClick}
                  className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden transition-opacity hover:opacity-80 ${onClick ? "cursor-pointer" : "cursor-default"}`}
                  style={{ backgroundColor: color + "18", border: `1.5px solid ${color}40` }}
                >
                  <svg width="30" height="32" viewBox="-14 -30 28 50" style={{ overflow: "visible" }}>
                    <PersonAvatar color={color} glow={false} />
                    {Object.keys(outfit).length > 0 && <ClothingOverlay outfit={outfit} catalog={clothingCatalog} />}
                  </svg>
                </button>
              );
              return (
                <>
                  {/* Header */}
                  <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2 bg-[#030912]/60 flex-shrink-0">
                    <button onClick={() => setRightPanel("dms")} className="text-slate-500 hover:text-slate-200 transition-colors p-1"><ChevronLeft className="w-4 h-4" /></button>
                    {conv && (
                      <button onClick={() => openProfile(conv.partner_id)} className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: conv.partner_color + "22", border: `1.5px solid ${conv.partner_color}55` }}>
                          <svg width="26" height="28" viewBox="-14 -30 28 50" style={{ overflow: "visible" }}>
                            <PersonAvatar color={conv.partner_color} glow={false} />
                            {Object.keys(dmPartnerOutfit).length > 0 && <ClothingOverlay outfit={dmPartnerOutfit} catalog={clothingCatalog} />}
                          </svg>
                        </div>
                        <span className="text-[14px] font-bold text-slate-200 truncate">{conv.partner_name}</span>
                      </button>
                    )}
                    {!conv && <span className="text-[14px] font-bold text-slate-200 flex-1">Privat besked</span>}
                    <button onClick={() => setRightPanel("hidden")} className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
                    {dmMessages.map((msg, i) => {
                      const isMe = msg.sender_id === currentProfile.id;
                      const showTime = i === 0 || (new Date(msg.created_at).getTime() - new Date(dmMessages[i-1].created_at).getTime()) > 5 * 60000;
                      // Show avatar only on last message of each consecutive group
                      const isLastInGroup = i === dmMessages.length - 1 || dmMessages[i + 1].sender_id !== msg.sender_id;
                      const avatarSlot = (
                        <div className="w-9 flex-shrink-0 flex items-end pb-0.5">
                          {isLastInGroup && (
                            isMe
                              ? <MiniAvatar color={myColor} outfit={myOutfit} onClick={() => setRightPanel("profile")} />
                              : conv && <MiniAvatar color={conv.partner_color} outfit={dmPartnerOutfit} onClick={() => openProfile(conv.partner_id)} />
                          )}
                        </div>
                      );
                      return (
                        <div key={msg.id} className="w-full">
                          {showTime && <p className="text-center text-[11px] text-slate-600 my-3">{new Date(msg.created_at).toLocaleString("da-DK", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</p>}
                          <div className={`flex items-end gap-1.5 w-full ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            {avatarSlot}
                            <div className={`max-w-[72%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${isMe ? "bg-violet-600 text-white rounded-br-sm" : "bg-white/[0.09] text-slate-200 rounded-bl-sm"}`}>
                              {msg.content}
                              {isMe && (
                                <span className="ml-2 inline-flex items-center text-white/50">
                                  {msg.read_at ? <CheckCheck className="w-3 h-3 text-teal-300" /> : msg.delivered_at ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={dmEndRef} />
                  </div>
                  {/* Input */}
                  <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] flex-shrink-0">
                    {dmEmojiOpen && (
                      <div className="mb-2 grid grid-cols-8 gap-1 p-2 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                        {["😀","😂","🥰","😎","😭","😡","🤔","👍","👎","❤️","🔥","💯","🎉","😏","🙈","💀"].map(e => (
                          <button key={e} onClick={() => setDmDraft(d => d + e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setDmEmojiOpen(o => !o)} className={`p-2 rounded-xl transition-colors ${dmEmojiOpen ? "text-amber-400 bg-amber-500/10" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"}`}>😊</button>
                      {myMutedUntil && new Date(myMutedUntil) > new Date() ? (
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-amber-950/40 border border-amber-500/20 rounded-xl">
                          <span className="text-[13px] text-amber-400">🔇 Du er muttet</span>
                        </div>
                      ) : (
                        <input
                          value={dmDraft}
                          onChange={e => setDmDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDmMessage(); } }}
                          placeholder="Skriv en besked..."
                          className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500/40"
                        />
                      )}
                      <button onClick={sendDmMessage} disabled={!dmDraft.trim() || !!(myMutedUntil && new Date(myMutedUntil) > new Date())} className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"><Send className="w-4 h-4" /></button>
                    </div>
                  </div>
                </>
              );
            })()}

          </div>
        )}

        </div>{/* end body */}

        {/* ── Trade request toast ── */}
        {tradeRequest && (
          <div className="absolute inset-0 z-[85] flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto bg-[#0d1526] border border-teal-500/40 rounded-2xl p-5 max-w-[320px] w-[90%] shadow-[0_8px_32px_rgba(0,0,0,0.8)] text-center animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: tradeRequest.from_color }} />
                <span className="text-[15px] font-bold text-white">{tradeRequest.from_name}</span>
              </div>
              <p className="text-[13px] text-slate-400 mb-4">anmoder om byttehandel</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => respondTrade(true)} className="px-5 py-2 bg-teal-600 hover:bg-teal-500 rounded-xl text-[14px] font-bold text-white transition-colors">Ja</button>
                <button onClick={() => respondTrade(false)} className="px-5 py-2 bg-white/[0.08] hover:bg-white/[0.14] rounded-xl text-[14px] font-bold text-slate-300 transition-colors">Nej</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Trade modal ── */}
        {tradeSession && (
          <div className="absolute inset-0 z-[86] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#080f1e] border border-white/[0.12] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] w-[min(780px,96vw)] max-h-[85vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🔄</span>
                  <span className="text-[15px] font-bold text-white">Byttehandel med </span>
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: tradeSession.partner_color }} />
                  <span className="text-[15px] font-bold" style={{ color: tradeSession.partner_color }}>{tradeSession.partner_name}</span>
                </div>
                <button onClick={cancelTrade} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"><X className="w-4 h-4" /></button>
              </div>

              {/* Two-column body */}
              <div className="flex flex-1 overflow-hidden divide-x divide-white/[0.06]">
                {/* My offer */}
                <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
                  <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Dit tilbud</p>

                  {/* Coins */}
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">🪙</span>
                    <input
                      type="number" min={0} max={coins} value={tradeSession.my_offer.coins}
                      onChange={e => updateMyOffer({ ...tradeSession.my_offer, coins: Math.max(0, Math.min(coins, parseInt(e.target.value) || 0)) })}
                      className="w-28 bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-1.5 text-[14px] text-white outline-none focus:border-teal-500/50"
                      placeholder="0"
                    />
                    <span className="text-[12px] text-slate-500">af {coins} valuta</span>
                  </div>

                  {/* My clothing to offer */}
                  {myWardrobe.length > 0 && (
                    <div>
                      <p className="text-[12px] text-slate-500 mb-1.5">Tøj</p>
                      <div className="flex flex-wrap gap-1.5">
                        {myWardrobe.map(w => {
                          const item = clothingCatalog.find(c => c.id === w.clothing_id);
                          if (!item) return null;
                          const inOffer = tradeSession.my_offer.clothing_ids.includes(w.clothing_id);
                          return (
                            <button
                              key={w.id}
                              onClick={() => updateMyOffer({ ...tradeSession.my_offer, clothing_ids: inOffer ? tradeSession.my_offer.clothing_ids.filter(id => id !== w.clothing_id) : [...tradeSession.my_offer.clothing_ids, w.clothing_id] })}
                              onMouseEnter={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setTradeTooltip({ x: r.left + r.width / 2, y: r.top, item_id: w.clothing_id, is_clothing: true }); }}
                              onMouseLeave={() => setTradeTooltip(null)}
                              className={`px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all border ${inOffer ? "border-teal-500/60 bg-teal-500/15 text-teal-300" : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:border-white/20"}`}
                            >
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* My inventory items to offer */}
                  {myInventory.length > 0 && (
                    <div>
                      <p className="text-[12px] text-slate-500 mb-1.5">Genstande</p>
                      <div className="flex flex-wrap gap-1.5">
                        {myInventory.map(item => {
                          const inOffer = tradeSession.my_offer.item_ids.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => updateMyOffer({ ...tradeSession.my_offer, item_ids: inOffer ? tradeSession.my_offer.item_ids.filter(id => id !== item.id) : [...tradeSession.my_offer.item_ids, item.id] })}
                              onMouseEnter={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setTradeTooltip({ x: r.left + r.width / 2, y: r.top, item_id: item.id, is_clothing: false }); }}
                              onMouseLeave={() => setTradeTooltip(null)}
                              className={`px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all border ${inOffer ? "border-teal-500/60 bg-teal-500/15 text-teal-300" : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:border-white/20"}`}
                            >
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {tradeSession.my_offer.coins === 0 && tradeSession.my_offer.clothing_ids.length === 0 && tradeSession.my_offer.item_ids.length === 0 && (
                    <p className="text-[13px] text-slate-600 italic">Intet tilbudt endnu</p>
                  )}
                </div>

                {/* Their offer */}
                <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto" style={{ background: "rgba(0,255,200,0.01)" }}>
                  <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">{tradeSession.partner_name}s tilbud</p>

                  {/* Their coins */}
                  {tradeSession.their_offer.coins > 0 && (
                    <div className="flex items-center gap-2">
                      <span>🪙</span>
                      <span className="text-[14px] font-semibold text-amber-300">{tradeSession.their_offer.coins} valuta</span>
                    </div>
                  )}

                  {/* Their clothing */}
                  {tradeSession.their_offer.clothing_ids.length > 0 && (
                    <div>
                      <p className="text-[12px] text-slate-500 mb-1.5">Tøj</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tradeSession.their_offer.clothing_ids.map(cid => {
                          const item = clothingCatalog.find(c => c.id === cid);
                          if (!item) return null;
                          return (
                            <span
                              key={cid}
                              onMouseEnter={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setTradeTooltip({ x: r.left + r.width / 2, y: r.top, item_id: cid, is_clothing: true }); }}
                              onMouseLeave={() => setTradeTooltip(null)}
                              className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium border border-violet-500/40 bg-violet-500/10 text-violet-300 cursor-default"
                            >
                              {item.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Their items */}
                  {tradeSession.their_offer.item_ids.length > 0 && (
                    <div>
                      <p className="text-[12px] text-slate-500 mb-1.5">Genstande</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tradeSession.their_offer.item_ids.map(iid => {
                          const item = [...partnerInventory].find(i => i.id === iid);
                          return (
                            <span
                              key={iid}
                              onMouseEnter={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setTradeTooltip({ x: r.left + r.width / 2, y: r.top, item_id: iid, is_clothing: false }); }}
                              onMouseLeave={() => setTradeTooltip(null)}
                              className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium border border-violet-500/40 bg-violet-500/10 text-violet-300 cursor-default"
                            >
                              {item?.name ?? iid}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {tradeSession.their_offer.coins === 0 && tradeSession.their_offer.clothing_ids.length === 0 && tradeSession.their_offer.item_ids.length === 0 && (
                    <p className="text-[13px] text-slate-600 italic">Afventer tilbud...</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.08] flex-shrink-0 bg-[#04090f]/60">
                <button onClick={cancelTrade} className="px-4 py-2 rounded-xl text-[14px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">Annuller</button>
                <div className="flex items-center gap-3">
                  {tradeSession.their_confirmed && !tradeSession.my_confirmed && (
                    <span className="text-[13px] text-teal-400 flex items-center gap-1">✓ {tradeSession.partner_name} har bekræftet</span>
                  )}
                  <button
                    onClick={confirmTrade}
                    disabled={tradeSession.my_confirmed}
                    className={`px-5 py-2 rounded-xl text-[14px] font-bold transition-all ${tradeSession.my_confirmed ? "bg-teal-600/40 text-teal-400/60 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_16px_rgba(20,184,166,0.3)]"}`}
                  >
                    {tradeSession.my_confirmed ? "✓ Bekræftet" : "Bekræft handel"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Trade item tooltip ── */}
        {tradeTooltip && (() => {
          if (tradeTooltip.is_clothing) {
            const item = clothingCatalog.find(c => c.id === tradeTooltip.item_id);
            if (!item) return null;
            return (
              <div className="fixed z-[9999] pointer-events-none" style={{ left: tradeTooltip.x, top: tradeTooltip.y - 8, transform: "translate(-50%, -100%)" }}>
                <div className="bg-[#0d1526] border border-white/[0.14] rounded-xl px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.8)] min-w-[120px]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[13px] font-bold text-white">{item.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 capitalize">{item.slot}</span>
                </div>
              </div>
            );
          } else {
            const item = [...myInventory, ...partnerInventory].find(i => i.id === tradeTooltip.item_id);
            if (!item) return null;
            return (
              <div className="fixed z-[9999] pointer-events-none" style={{ left: tradeTooltip.x, top: tradeTooltip.y - 8, transform: "translate(-50%, -100%)" }}>
                <div className="bg-[#0d1526] border border-white/[0.14] rounded-xl px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.8)] min-w-[120px]">
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="16" height="16" viewBox="-16 -16 32 32" className="flex-shrink-0"><ItemSVG type={item.item_type} /></svg>
                    <span className="text-[13px] font-bold text-white">{item.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 capitalize">{item.item_type}</span>
                </div>
              </div>
            );
          }
        })()}

        {/* ── Disconnect overlay ── */}
        {disconnected && (
          <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-[#020609]/97 backdrop-blur-md">
            <div className="flex flex-col items-center gap-4 bg-[#0a1628]/90 border border-white/[0.1] rounded-2xl px-8 py-8 max-w-[360px] w-[90%] shadow-[0_24px_80px_rgba(0,0,0,0.9)] text-center">
              <div className="text-5xl">{disconnectMsg.includes("inaktivitet") ? "😴" : "⏱"}</div>
              <div>
                <p className="text-[17px] font-black text-white mb-1">{disconnectMsg}</p>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  {disconnectMsg.includes("inaktivitet")
                    ? "Du var inaktiv i over 30 minutter og er blevet afkoblet."
                    : "Du besvarede ikke tilstedeværelsesbekræftelsen inden for tidsfristen."}
                </p>
              </div>
              <button
                onClick={() => { disconnectedRef.current = false; setDisconnected(false); lastActivityRef.current = Date.now(); reloadChat(); }}
                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-[15px] font-semibold text-white transition-colors w-full justify-center"
              >
                <RefreshCw className="w-4 h-4" /> Genopret forbindelse
              </button>
            </div>
          </div>
        )}

        {/* ── Hourly confirmation modal ── */}
        {showConfirmModal && !disconnected && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0d1526] border border-violet-500/30 rounded-2xl p-6 max-w-[320px] w-[90%] shadow-2xl text-center">
              <div className="text-3xl mb-3">⏰</div>
              <p className="text-[15px] font-bold text-white mb-1.5">Er du stadig her?</p>
              <p className="text-[14px] text-slate-400 mb-4">Bekræft din tilstedeværelse for at forblive tilkoblet og modtage <span className="text-amber-400 font-semibold">🪙 100 mønter</span> + <span className="text-violet-400 font-semibold">⚡ 50 XP</span>.</p>
              <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-4 overflow-hidden">
                <div className="h-full bg-violet-500 transition-all duration-1000" style={{ width: `${(confirmCountdown / 120) * 100}%` }} />
              </div>
              <p className="text-[13px] text-slate-500 mb-5">{confirmCountdown}s tilbage</p>
              <button
                onClick={confirmPresence}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-[15px] font-bold text-white transition-colors"
              >
                Ja, jeg er her! 👋
              </button>
            </div>
          </div>
        )}

      </div>
      </div>{/* end flex items-stretch wrapper */}

      {/* Context menu */}
      {ctxMenu && (
        <div className="fixed z-[60] bg-[#0d1117] border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden w-[220px]" style={{ left: ctxMenu.clientX, top: ctxMenu.clientY }} onClick={e => e.stopPropagation()}>

          {ctxMenu.kind === "self" && (
            <>
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-white/[0.04]" style={{ border: `1.5px solid ${myColor}44` }}>
                  <svg width="40" height="40" viewBox="-20 -30 40 48">
                    <PersonAvatar color={myColor} tanLevel={tanLevel} />
                    <ClothingOverlay outfit={myOutfit ?? {}} catalog={clothingCatalog} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-100 truncate">{currentProfile.display_name}</p>
                  <p className="text-[11px] text-slate-500">Dig selv</p>
                </div>
              </div>
              <div className="py-1">
                <button className="w-full text-left px-4 py-2.5 text-[13px] text-slate-300 hover:bg-white/[0.05] flex items-center gap-3 transition-colors" onClick={() => { setCtxMenu(null); setRightPanel("profile"); }}>
                  <User className="w-4 h-4 text-slate-500 flex-shrink-0" /> Min profil
                </button>
                <button className="w-full text-left px-4 py-2.5 text-[13px] text-slate-300 hover:bg-white/[0.05] flex items-center gap-3 transition-colors" onClick={() => { setCtxMenu(null); setRightPanel("inventory"); }}>
                  <Package className="w-4 h-4 text-slate-500 flex-shrink-0" /> Rygsæk
                </button>
              </div>
            </>
          )}

          {ctxMenu.kind === "bot" && ctxMenu.bot && (() => {
            const bot = ctxMenu.bot!;
            const givesItem = clothingCatalog.find(c => c.id === bot.gives_clothing_id);
            const alreadyOwned = givesItem && myWardrobe.some(w => w.clothing_id === bot.gives_clothing_id);
            return (
              <>
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-white/[0.04]" style={{ border: `1.5px solid ${bot.color}44` }}>
                    <svg width="40" height="40" viewBox="-20 -30 40 48">
                      <PersonAvatar color={bot.color} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-100 truncate">{bot.name}</p>
                    <p className="text-[11px] text-slate-500">Bot</p>
                  </div>
                </div>
                <div className="py-1">
                  {givesItem && (
                    <button onClick={() => takeFromBot(bot)} disabled={alreadyOwned} className={`w-full text-left px-4 py-2.5 text-[13px] flex items-center gap-3 transition-colors ${alreadyOwned ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:bg-white/[0.05]"}`}>
                      <Gift className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{alreadyOwned ? "Allerede ejet" : `Hent ${givesItem.name}`}</span>
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button onClick={() => { setMovingBotId(bot.id); setCtxMenu(null); }} className="w-full text-left px-4 py-2.5 text-[13px] text-slate-300 hover:bg-white/[0.05] flex items-center gap-3 transition-colors">
                        <Wrench className="w-4 h-4 text-slate-500 flex-shrink-0" /> Flyt bot
                      </button>
                      <button onClick={() => deleteBot(bot.id)} className="w-full text-left px-4 py-2.5 text-[13px] text-rose-400 hover:bg-rose-500/[0.08] flex items-center gap-3 transition-colors">
                        <Trash2 className="w-4 h-4 flex-shrink-0" /> Slet bot
                      </button>
                    </>
                  )}
                </div>
              </>
            );
          })()}

          {ctxMenu.kind === "user" && ctxMenu.user && (() => {
            const u = ctxMenu.user!;
            const theirCarriedItems = items.filter(i => i.owner_id === u.user_id);
            return (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-white/[0.04]" style={{ border: `1.5px solid ${u.color}44` }}>
                    <svg width="40" height="40" viewBox="-20 -30 40 48">
                      <PersonAvatar color={u.color} tanLevel={u.tan_level ?? 0} />
                      <ClothingOverlay outfit={u.outfit ?? {}} catalog={clothingCatalog} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-100 truncate">{u.display_name}</p>
                    {theirCarriedItems.length > 0 && <p className="text-[11px] text-slate-500">{theirCarriedItems.length} genstand{theirCarriedItems.length !== 1 ? "e" : ""} i rygsæk</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="py-1">
                  <button className="w-full text-left px-4 py-2.5 text-[13px] text-slate-300 hover:bg-white/[0.05] flex items-center gap-3 transition-colors" onClick={() => openProfile(u.user_id)}>
                    <User className="w-4 h-4 text-slate-500 flex-shrink-0" /> Se profil
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-[13px] text-slate-300 hover:bg-white/[0.05] flex items-center gap-3 transition-colors" onClick={() => startDmWith(u.user_id, u.display_name, u.color)}>
                    <MessageSquare className="w-4 h-4 text-slate-500 flex-shrink-0" /> Send besked
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-[13px] text-slate-300 hover:bg-white/[0.05] flex items-center gap-3 transition-colors" onClick={() => {
                    setCtxMenu(null);
                    setViewingInventory({ userId: u.user_id, name: u.display_name, color: u.color, items: theirCarriedItems });
                  }}>
                    <Package className="w-4 h-4 text-slate-500 flex-shrink-0" /> Se inventar
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-[13px] text-slate-300 hover:bg-white/[0.05] flex items-center gap-3 transition-colors" onClick={() => startTrade(u)}>
                    <ArrowLeftRight className="w-4 h-4 text-slate-500 flex-shrink-0" /> Byt genstande
                  </button>
                  {spaceshipOf.has(u.user_id) && activeRoomId !== spaceshipOf.get(u.user_id)?.id && (
                    <button className="w-full text-left px-4 py-2.5 text-[13px] text-slate-300 hover:bg-white/[0.05] flex items-center gap-3 transition-colors" onClick={() => {
                      const ship = spaceshipOf.get(u.user_id)!;
                      setCtxMenu(null);
                      setAwaitingVisit(true);
                      channelRef.current?.send({ type: "broadcast", event: "spaceship_request", payload: { to_id: u.user_id, from_id: currentProfile.id, from_name: currentProfile.display_name, spaceship_room_id: ship.id, spaceship_room_name: ship.name } });
                      setTimeout(() => setAwaitingVisit(false), 30000);
                    }}>
                      <Rocket className="w-4 h-4 text-slate-500 flex-shrink-0" /> Gå til rumskib
                    </button>
                  )}
                </div>

                {/* Admin / spaceship owner actions */}
                {(isAdmin || (activeRoomType === "spaceship" && activeRoomOwnerId === currentProfile.id)) && (
                  <div className="border-t border-white/[0.06] py-1">
                    {isAdmin && myInventory.length > 0 && (
                      <>
                        <p className="px-4 pt-1.5 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Giv genstand</p>
                        {myInventory.map(item => (
                          <button key={item.id} onClick={() => giveItem(item, u.user_id)} className="w-full text-left px-4 py-2 text-[13px] text-slate-400 hover:bg-white/[0.05] flex items-center gap-3 transition-colors">
                            <Gift className="w-4 h-4 text-slate-600 flex-shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </button>
                        ))}
                      </>
                    )}
                    {activeRoomType === "spaceship" && activeRoomOwnerId === currentProfile.id && (
                      <button className="w-full text-left px-4 py-2.5 text-[13px] text-orange-400 hover:bg-orange-500/[0.08] flex items-center gap-3 transition-colors" onClick={() => kickFromSpaceship(u)}>
                        <Rocket className="w-4 h-4 flex-shrink-0" /> Smid ud af rumskib
                      </button>
                    )}
                    {isAdmin && (
                      <button className="w-full text-left px-4 py-2.5 text-[13px] text-rose-400 hover:bg-rose-500/[0.08] flex items-center gap-3 transition-colors" onClick={() => kickUser(u)}>
                        <Ban className="w-4 h-4 flex-shrink-0" /> Kick bruger
                      </button>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {ctxMenu.kind === "tile_item" && ctxMenu.item && (() => {
            const ci = ctxMenu.item!;
            const meta = ITEM_TYPES.find(t => t.type === ci.item_type);
            const myCountOfType = items.filter(i => i.item_type === ci.item_type && i.owner_id === currentProfile.id).length;
            const roomCountOfType = items.filter(i => i.item_type === ci.item_type && !i.owner_id).length;
            const isWall = !!ci.wall_side;
            return (
              <>
                {/* Preview + name */}
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3 bg-white/[0.02]">
                  <div className="w-14 h-14 rounded-xl bg-white/[0.06] border border-white/[0.05] flex items-center justify-center flex-shrink-0">
                    <svg width="44" height="44" viewBox="-18 -18 36 36"><ItemSVG type={ci.item_type} /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-white truncate">{ci.name}</p>
                    <span className="inline-flex mt-1 text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ color: meta?.color ?? "#6b7280", backgroundColor: `${meta?.color ?? "#6b7280"}22` }}>
                      {meta?.label ?? ci.item_type}{isWall ? " · Væg" : ""}
                    </span>
                  </div>
                </div>
                {/* Stats */}
                <div className="px-3 py-2.5 border-b border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-slate-500">Værdi</span>
                    <span className="text-amber-400 font-semibold">🪙 {meta?.value ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-slate-500">Størrelse</span>
                    <span className="text-slate-200 font-medium">{Math.round((ci.item_scale ?? 1) * 100)}%</span>
                  </div>
                  {!isWall && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-slate-500">Rotation</span>
                      <span className="text-slate-200 font-medium">{(ci.rotation ?? 0) * 90}°</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-slate-500">Antal i rummet</span>
                    <span className="text-slate-200 font-medium">{roomCountOfType}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-slate-500">Du ejer</span>
                    <span className="text-slate-200 font-medium">{myCountOfType}</span>
                  </div>
                </div>
                {/* Actions */}
                {!isWall && isSpaceshipOwner && (
                  <button className="w-full text-left px-3 py-2 text-[14px] text-blue-300 hover:bg-blue-500/10 flex items-center gap-2" onClick={() => {
                    setCtxMenu(null);
                    setPlacingItem({ item: ci, rotation: ci.rotation ?? 0 });
                    setMovingFloorItemId(ci.id);
                  }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
                    Flyt
                  </button>
                )}
                {!isWall && (
                  <button className="w-full text-left px-3 py-2 text-[14px] text-slate-300 hover:bg-white/[0.06]" onClick={() => rotateItem(ci)}>Roter (R)</button>
                )}
                <button className="w-full text-left px-3 py-2 text-[14px] text-slate-300 hover:bg-white/[0.06]" onClick={() => pickupItem(ci)}>Tag op til inventar</button>
                {isAdmin && <button className="w-full text-left px-3 py-2 text-[14px] text-rose-400 hover:bg-rose-500/10" onClick={() => deleteItem(ci.id)}>Slet genstand</button>}
              </>
            );
          })()}

          {ctxMenu.kind === "tile" && ctxMenu.tileGx !== undefined && ctxMenu.tileGy !== undefined && (() => {
            const key = `${ctxMenu.tileGx},${ctxMenu.tileGy}`;
            const locked = lockedTiles.has(key);
            return (
              <>
                <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Felt ({ctxMenu.tileGx}, {ctxMenu.tileGy})</span>
                  {locked && <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wide">Låst</span>}
                </div>
                <button
                  onClick={() => toggleTileLock(ctxMenu.tileGx!, ctxMenu.tileGy!)}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${locked ? "text-emerald-400 hover:bg-emerald-500/10" : "text-rose-400 hover:bg-rose-500/10"}`}>
                  <span>{locked ? "🔓" : "🔒"}</span>
                  {locked ? "Åbn felt" : "Lås felt"}
                </button>
              </>
            );
          })()}

          {ctxMenu.kind === "wall" && ctxMenu.wallSide !== undefined && (
            <>
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-violet-400" />
                <p className="text-[13px] font-semibold text-slate-100">Tilføj til væg</p>
                <p className="text-[11px] text-slate-500 ml-auto">{ctxMenu.wallSide === "left" ? "Venstre" : "Højre"}</p>
              </div>
              <div className="py-1 border-b border-white/[0.06]">
                <button
                  onClick={async () => {
                    const { data } = await supabase.from("virtual_room_items").insert({
                      room_id: activeRoomId,
                      name: "Dartskive",
                      item_type: "dartboard",
                      wall_side: ctxMenu.wallSide,
                      wall_pos: ctxMenu.wallPosition ?? 0.5,
                      wall_height: 80,
                      item_scale: 1.0,
                      gx: null, gy: null,
                    }).select().single();
                    if (data) setItems(prev => [...prev, data as RoomItem]);
                    setCtxMenu(null);
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-amber-300 hover:bg-amber-500/[0.08] flex items-center gap-3 transition-colors">
                  🎯 Tilføj dartskive
                </button>
              </div>
              <div className="p-3 flex flex-col gap-2.5">
                {/* Type */}
                <div className="flex gap-1.5">
                  {(["door", "window"] as const).map(t => (
                    <button key={t} onClick={() => setPortalFormType(t)}
                      className="flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-all"
                      style={{
                        background: portalFormType === t ? (t === "door" ? "rgba(99,102,241,0.2)" : "rgba(34,211,238,0.15)") : "rgba(255,255,255,0.03)",
                        borderColor: portalFormType === t ? (t === "door" ? "#6366f1" : "#22d3ee") : "rgba(255,255,255,0.07)",
                        color: portalFormType === t ? (t === "door" ? "#a5b4fc" : "#67e8f9") : "#64748b",
                      }}>
                      {t === "door" ? "🚪 Dør" : "🪟 Vindue"}
                    </button>
                  ))}
                </div>
                {/* Size */}
                <div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Størrelse</p>
                  <div className="flex gap-1.5">
                    {([1, 2, 3] as const).map(s => (
                      <button key={s} onClick={() => setPortalFormSize(s)}
                        className="flex-1 py-1.5 rounded-lg text-[12px] font-bold border-2 transition-all"
                        style={{
                          background: portalFormSize === s ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.03)",
                          borderColor: portalFormSize === s ? "#fbbf24" : "rgba(255,255,255,0.07)",
                          color: portalFormSize === s ? "#fde68a" : "#64748b",
                        }}>
                        {s === 1 ? "Smal" : s === 2 ? "Normal" : "Bred"}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Target room (doors only) */}
                {portalFormType === "door" && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Destination</p>
                    <select
                      value={portalFormTargetRoomId}
                      onChange={e => setPortalFormTargetRoomId(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[12px] text-slate-200 outline-none focus:border-violet-500/50">
                      <option value="">Vælg rum...</option>
                      {rooms.filter(r => r.id !== activeRoomId).map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Create button */}
                <button
                  disabled={portalFormType === "door" && !portalFormTargetRoomId}
                  onClick={async () => {
                    if (portalFormType === "door" && !portalFormTargetRoomId) return;
                    const { data } = await supabase.from("room_portals").insert({
                      room_id: activeRoomId,
                      wall_side: ctxMenu.wallSide,
                      portal_type: portalFormType,
                      position: ctxMenu.wallPosition ?? 0.32,
                      size: portalFormSize,
                      target_room_id: portalFormType === "door" ? portalFormTargetRoomId : null,
                    }).select().single();
                    if (data) setPortals(prev => [...prev, data as RoomPortal]);
                    setCtxMenu(null);
                  }}
                  className={`w-full py-2.5 rounded-xl text-[13px] font-black transition-all ${
                    (portalFormType === "window" || portalFormTargetRoomId)
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
                  }`}>
                  Opret
                </button>
              </div>
            </>
          )}

          {ctxMenu.kind === "portal" && ctxMenu.portal && (
            <>
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <span className="text-[14px]">{ctxMenu.portal.portal_type === "door" ? "🚪" : "🪟"}</span>
                <p className="text-[13px] font-semibold text-slate-200">
                  {ctxMenu.portal.portal_type === "door" ? "Dør" : "Vindue"} · {ctxMenu.portal.size === 1 ? "Smal" : ctxMenu.portal.size === 2 ? "Normal" : "Bred"}
                </p>
              </div>
              <div className="py-1">
                <button
                  onClick={async () => {
                    supabase.from("room_portals").delete().eq("id", ctxMenu.portal!.id).then(() => {});
                    setPortals(prev => prev.filter(p => p.id !== ctxMenu.portal!.id));
                    setCtxMenu(null);
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-rose-400 hover:bg-rose-500/[0.08] flex items-center gap-3 transition-colors">
                  <Trash2 className="w-4 h-4 flex-shrink-0" /> Slet
                </button>
              </div>
            </>
          )}

          {ctxMenu.kind === "dartboard" && ctxMenu.item && (
            <>
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <span className="text-[18px]">🎯</span>
                <p className="text-[13px] font-semibold text-slate-100">Dartskive</p>
              </div>
              <div className="py-1">
                {!dartGames.some(g => g.item_id === ctxMenu.item!.id && g.status !== "finished") ? (
                  <button
                    onClick={() => { setDartStartModal({ itemId: ctxMenu.item!.id }); setCtxMenu(null); }}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-amber-300 hover:bg-amber-500/[0.08] flex items-center gap-3 transition-colors">
                    🎮 Begynd spil
                  </button>
                ) : (
                  <p className="px-4 py-2.5 text-[12px] text-slate-500 italic">Spil i gang...</p>
                )}
                {(isAdmin || (activeRoomType === "spaceship" && activeRoomOwnerId === currentProfile.id)) && (
                  <button
                    onClick={async () => {
                      supabase.from("virtual_room_items").delete().eq("id", ctxMenu.item!.id).then(() => {});
                      setItems(prev => prev.filter(i => i.id !== ctxMenu.item!.id));
                      setCtxMenu(null);
                    }}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-rose-400 hover:bg-rose-500/[0.08] flex items-center gap-3 transition-colors">
                    <Trash2 className="w-4 h-4 flex-shrink-0" /> Fjern dartskive
                  </button>
                )}
              </div>
            </>
          )}

          {ctxMenu.kind === "dartscoreboard" && ctxMenu.item && (
            <>
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <span className="text-[14px]">📋</span>
                <p className="text-[13px] font-semibold text-slate-100">Dartresultater</p>
              </div>
              <div className="py-1">
                {dartGames.filter(g => g.item_id === ctxMenu.item!.id).map(g => (
                  <button key={g.id}
                    onClick={() => { setDartHistoryModal({ gameId: g.id }); setCtxMenu(null); }}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-slate-200 hover:bg-white/[0.05] flex items-center gap-3 transition-colors">
                    📊 Se fuldt spil
                  </button>
                ))}
                {dartGames.filter(g => g.item_id === ctxMenu.item!.id).length === 0 && (
                  <p className="px-4 py-2.5 text-[12px] text-slate-500 italic">Intet aktivt spil</p>
                )}
              </div>
            </>
          )}
        </div>
      )}


      {/* ── Dart: Start Game Modal ── */}
      {dartStartModal && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDartStartModal(null)}>
          <div className="w-80 bg-[#0d1117] border border-white/[0.12] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <p className="text-[15px] font-black text-slate-100">Dart – Nyt spil</p>
              <button onClick={() => setDartStartModal(null)} className="ml-auto text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Spiltype</p>
                <div className="flex gap-2">
                  {([201, 301, 501] as const).map(gt => (
                    <button key={gt} onClick={() => setDartStartGameType(gt)}
                      className="flex-1 py-2 rounded-xl text-[13px] font-black border-2 transition-all"
                      style={{
                        background: dartStartGameType === gt ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.03)",
                        borderColor: dartStartGameType === gt ? "#fbbf24" : "rgba(255,255,255,0.07)",
                        color: dartStartGameType === gt ? "#fde68a" : "#64748b",
                      }}>{gt}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Modstander</p>
                <select value={dartStartOpponentId} onChange={e => setDartStartOpponentId(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-slate-200 outline-none focus:border-amber-500/50">
                  <option value="">Vælg spiller...</option>
                  {Array.from(users.values()).filter(u => u.user_id !== currentProfile.id).map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.display_name}</option>
                  ))}
                </select>
              </div>
              <button
                disabled={!dartStartOpponentId}
                onClick={async () => {
                  if (!dartStartOpponentId || !dartStartModal) return;
                  const opp = users.get(dartStartOpponentId);
                  if (!opp) return;
                  const { data } = await supabase.from("dart_games").insert({
                    room_id: activeRoomId,
                    item_id: dartStartModal.itemId,
                    game_type: dartStartGameType,
                    player1_id: currentProfile.id,
                    player2_id: dartStartOpponentId,
                    player1_name: currentProfile.display_name,
                    player2_name: opp.display_name,
                    player1_score: dartStartGameType,
                    player2_score: dartStartGameType,
                    current_player_id: currentProfile.id,
                    throws_this_turn: 0,
                    status: "pending",
                  }).select().single();
                  if (data) setDartGames(prev => [...prev, data as DartGame]);
                  setDartStartModal(null);
                }}
                className={`w-full py-3 rounded-xl text-[14px] font-black transition-all ${dartStartOpponentId ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 shadow-[0_4px_16px_rgba(245,158,11,0.3)]" : "bg-white/[0.05] text-slate-600 cursor-not-allowed"}`}>
                Start spil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dart: Invite Modal (opponent confirmation) ── */}
      {dartInviteModal && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-76 bg-[#0d1117] border border-white/[0.12] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-[14px] font-black text-slate-100">Dart-udfordring!</p>
                <p className="text-[12px] text-slate-400">{dartInviteModal.game.player1_name} inviterer dig til {dartInviteModal.game.game_type}</p>
              </div>
            </div>
            <div className="p-5 flex gap-3">
              <button
                onClick={async () => {
                  supabase.from("dart_games").update({ status: "active" }).eq("id", dartInviteModal.game.id).then(() => {});
                  setDartInviteModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
                Acceptér
              </button>
              <button
                onClick={async () => {
                  supabase.from("dart_games").delete().eq("id", dartInviteModal.game.id).then(() => {});
                  setDartGames(prev => prev.filter(g => g.id !== dartInviteModal!.game.id));
                  setDartInviteModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-black bg-white/[0.06] hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20">
                Afslå
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dart: History Modal ── */}
      {dartHistoryModal && (() => {
        const game = dartGames.find(g => g.id === dartHistoryModal.gameId);
        const throws = dartThrows.filter(t => t.game_id === dartHistoryModal.gameId);
        // Group throws by player & turn
        const turns: { playerId: string; playerName: string; throws: DartThrow[] }[] = [];
        let curTurn: typeof turns[0] | null = null;
        for (const t of [...throws].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())) {
          if (!curTurn || curTurn.playerId !== t.player_id || curTurn.throws.length >= 3) {
            curTurn = { playerId: t.player_id, playerName: game?.player1_id === t.player_id ? (game?.player1_name ?? t.player_id) : (game?.player2_name ?? t.player_id), throws: [] };
            turns.push(curTurn);
          }
          curTurn.throws.push(t);
        }
        return (
          <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDartHistoryModal(null)}>
            <div className="w-80 max-h-[70vh] flex flex-col bg-[#0d1117] border border-white/[0.12] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3 flex-shrink-0">
                <span className="text-xl">🎯</span>
                <p className="text-[14px] font-black text-slate-100">{game?.player1_name ?? "?"} vs {game?.player2_name ?? "?"}</p>
                <button onClick={() => setDartHistoryModal(null)} className="ml-auto text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {turns.length === 0 && <p className="text-[12px] text-slate-500 text-center py-4">Ingen kast endnu</p>}
                {turns.map((turn, ti) => (
                  <div key={ti} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                    <p className="text-[11px] font-bold text-slate-400 mb-1.5">{turn.playerName}</p>
                    {turn.throws.map((th, i) => {
                      const segLabel = th.segment === 50 ? "BULLSEYE" : th.segment === 25 ? "Bull" : th.segment === 0 ? "Miss" :
                        th.multiplier === 3 ? `T${th.segment}` : th.multiplier === 2 ? `D${th.segment}` : `${th.segment}`;
                      return (
                        <div key={i} className="flex items-center gap-2 py-0.5">
                          <span className="text-[10px] text-slate-600 w-4">{th.throw_number}.</span>
                          <span className={`text-[12px] font-bold ${th.is_bust ? "text-rose-400" : th.points >= 40 ? "text-amber-300" : "text-slate-200"}`}>{segLabel}</span>
                          <span className="text-[11px] text-slate-500 ml-auto">{th.points} pts</span>
                          <span className="text-[11px] text-slate-400">→ {th.score_after}</span>
                          {th.is_bust && <span className="text-[10px] text-rose-400 font-bold">BUST</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {game?.winner_id && (
                <div className="px-5 py-3 border-t border-white/[0.08] flex-shrink-0 bg-emerald-500/10">
                  <p className="text-[13px] font-black text-emerald-400 text-center">
                    🏆 {game.winner_id === game.player1_id ? game.player1_name : game.player2_name} vinder!
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Room hover tooltip — fixed position, never clipped */}
      {hoveredRoomId && tooltipPos && (() => {
        const hRoom = rooms.find(rm => rm.id === hoveredRoomId);
        if (!hRoom) return null;
        const ht = ROOM_THEMES.find(t => t.id === (hRoom.theme_key ?? "blue")) ?? ROOM_THEMES[0];
        return (
          <div
            className="fixed z-[9999] w-52 rounded-xl overflow-hidden border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.9)] pointer-events-none"
            style={{ right: window.innerWidth - tooltipPos.x + 4, top: tooltipPos.y, transform: "translateY(-20%)" }}
          >
            <div className="w-full h-20" style={{ background: ht.even }}>
              <MiniRoomPreview cols={hRoom.cols} rows={hRoom.rows} themeKey={hRoom.theme_key ?? "blue"} />
            </div>
            <div className="px-3 py-2 flex items-center justify-between" style={{ background: "rgba(4,9,18,0.95)" }}>
              <div>
                <p className="text-[14px] font-bold text-slate-200 truncate">{hRoom.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{hRoom.cols}×{hRoom.rows} felter</p>
              </div>
              <span className={`text-[12px] font-bold flex-shrink-0 ${(roomOccupancy.get(hRoom.id) ?? 0) > 0 ? "text-emerald-400" : "text-slate-600"}`}>{roomOccupancy.get(hRoom.id) ?? 0} online</span>
            </div>
          </div>
        );
      })()}

      {/* Passcode prompt modal */}
      {passcodePrompt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPasscodePrompt(null)}>
          <div className="bg-[#060e1c] rounded-2xl border border-white/[0.12] p-6 w-80 shadow-[0_24px_64px_rgba(0,0,0,0.95)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-xl flex-shrink-0">🔒</div>
              <div>
                <p className="text-[14px] font-bold text-white">Kodelåst rumskib</p>
                <p className="text-[13px] text-slate-500 truncate">{passcodePrompt.room.name}</p>
              </div>
            </div>
            <input
              autoFocus
              type="password"
              value={passcodeInput}
              onChange={e => { setPasscodeInput(e.target.value); setPasscodeError(false); }}
              onKeyDown={e => e.key === "Enter" && verifyPasscode()}
              placeholder="Indtast adgangskode..."
              className={`w-full bg-white/[0.05] border rounded-xl px-4 py-3 text-[15px] text-slate-200 placeholder-slate-600 outline-none transition-all mb-3 ${passcodeError ? "border-rose-500/50 focus:border-rose-500/70" : "border-white/[0.08] focus:border-violet-500/50"}`}
            />
            {passcodeError && <p className="text-[13px] text-rose-400 mb-3 flex items-center gap-1.5"><span>⚠️</span>Forkert adgangskode</p>}
            <div className="flex gap-2">
              <button onClick={() => setPasscodePrompt(null)} className="flex-1 py-2.5 bg-white/[0.05] rounded-xl text-slate-400 text-[14px] font-semibold hover:bg-white/[0.09] transition-colors border border-white/[0.06]">Annuller</button>
              <button onClick={verifyPasscode} className="flex-1 py-2.5 rounded-xl text-white text-[14px] font-bold transition-all shadow-[0_4px_20px_rgba(124,58,237,0.3)]" style={{ background: "linear-gradient(135deg,#6d28d9,#4f46e5)" }}>Gå ind 🚀</button>
            </div>
          </div>
        </div>
      )}

      {/* UserProfileModal replaced by inline side panel */}

      {/* ── Inventory viewer popup ── */}
      {viewingInventory && (
        <div className="absolute inset-0 z-[55] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto w-[320px] max-h-[420px] flex flex-col rounded-2xl bg-[#0d1117]/95 border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.7)]" style={{ backdropFilter: "blur(16px)" }}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: viewingInventory.color + "33", border: `1.5px solid ${viewingInventory.color}55` }}>
                <span className="text-[14px] font-bold" style={{ color: viewingInventory.color }}>{viewingInventory.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-slate-100 truncate">{viewingInventory.name}</p>
                <p className="text-[12px] text-slate-500">{viewingInventory.items.length} genstand{viewingInventory.items.length !== 1 ? "e" : ""}</p>
              </div>
              <button onClick={() => setViewingInventory(null)} className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Items */}
            <div className="flex-1 overflow-y-auto p-3">
              {viewingInventory.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Package className="w-8 h-8 text-slate-700" />
                  <p className="text-[13px] text-slate-600">Ingen genstande</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {viewingInventory.items.map(item => (
                    <div key={item.id} className="aspect-square rounded-xl bg-white/[0.04] border border-white/[0.06] flex flex-col items-center justify-center gap-1.5 p-2">
                      <svg width="36" height="36" viewBox="-18 -18 36 36"><ItemSVG type={item.item_type} /></svg>
                      <p className="text-[10px] text-slate-400 text-center leading-tight truncate w-full text-center">{item.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
