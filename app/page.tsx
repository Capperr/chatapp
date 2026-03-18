"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { VirtualRoom } from "@/components/chat/VirtualRoom";
import { ChatGateway } from "@/components/chat/ChatGateway";
import type { Profile } from "@/types";

interface RoomMeta { id: string; name: string; cols: number; rows: number; is_default: boolean; room_type?: string; owner_id?: string | null; }
interface ClothingItem { id: string; name: string; slot: string; style_key: string; color?: string | null; image_url?: string | null; img_x?: number | null; img_y?: number | null; img_w?: number | null; img_h?: number | null; }
interface TeamMember { profile: Profile; outfit: Record<string, string>; catalog: ClothingItem[]; }

// ── SVG clothing helpers ───────────────────────────────────────────────────────
function ClothingLayerSVG({ styleKey, color }: { styleKey: string; color?: string | null }) {
  const c = color ?? "#00e5cc";
  switch (styleKey) {
    case "top_hat": return <g><rect x="-8" y="-36" width="16" height="5" rx="1" fill={c} /><rect x="-6" y="-50" width="12" height="15" rx="2" fill={c} /></g>;
    case "cap": return <g><ellipse cx="0" cy="-35" rx="10" ry="4" fill={c} /><rect x="-10" y="-39" width="20" height="5" rx="2" fill={c} /><rect x="8" y="-36" width="8" height="3" rx="1.5" fill={c} /></g>;
    case "crown": return <g><rect x="-9" y="-42" width="18" height="8" rx="1" fill={c} /><polygon points="-9,-42 -9,-52 -4.5,-46 0,-52 4.5,-46 9,-52 9,-42" fill={c} /></g>;
    case "cowboy": return <g><ellipse cx="0" cy="-35" rx="14" ry="4" fill={c} /><ellipse cx="0" cy="-39" rx="8" ry="6" fill={c} /></g>;
    case "glasses": return <g><circle cx="-6" cy="-27" r="4" fill="none" stroke={c} strokeWidth="2" /><circle cx="6" cy="-27" r="4" fill="none" stroke={c} strokeWidth="2" /><line x1="-2" y1="-27" x2="2" y2="-27" stroke={c} strokeWidth="1.5" /></g>;
    case "visor": return <g><rect x="-10" y="-32" width="20" height="5" rx="2.5" fill={c} /><rect x="-9" y="-27" width="18" height="3" rx="1.5" fill={c} opacity="0.6" /></g>;
    case "beard": return <g><ellipse cx="0" cy="-12" rx="8" ry="5" fill={c} opacity="0.85" /></g>;
    case "necklace": return <g><path d="M-8,-18 Q0,-13 8,-18" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" /><circle cx="0" cy="-12" r="2.5" fill={c} /></g>;
    case "scarf": return <g><rect x="-10" y="-22" width="20" height="6" rx="3" fill={c} /><rect x="-3" y="-17" width="6" height="10" rx="2" fill={c} opacity="0.8" /></g>;
    default: return null;
  }
}

function ClothingOverlayLP({ outfit, catalog }: { outfit: Record<string, string>; catalog: ClothingItem[] }) {
  return (
    <>
      {Object.entries(outfit).map(([slot, cid]) => {
        const item = catalog.find(c => c.id === cid);
        if (!item) return null;
        if (item.image_url) {
          return <image key={slot} href={item.image_url} x={item.img_x ?? -31} y={item.img_y ?? -36} width={item.img_w ?? 62} height={item.img_h ?? 77} />;
        }
        return <ClothingLayerSVG key={slot} styleKey={item.style_key} color={item.color} />;
      })}
    </>
  );
}

// ── Floating alien figure ───────────────────────────────────────────────────────
function AlienFigure({ color, scale = 1 }: { color: string; scale?: number }) {
  const filterId = `lp-tint-${color.replace("#", "")}`;
  return (
    <svg width={62 * scale} height={77 * scale} viewBox="-31 -36 62 77" style={{ overflow: "visible" }}>
      <defs>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feFlood floodColor={color} result="flood" />
          <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask" />
          <feBlend in="mask" in2="SourceGraphic" mode="color" />
        </filter>
      </defs>
      <ellipse cx="0" cy="38" rx="16" ry="4.5" fill="rgba(0,0,0,0.4)" />
      <image href="/alien.png" x="-31" y="-36" width="62" height="77" filter={`url(#${filterId})`} />
    </svg>
  );
}

// ── Team card ───────────────────────────────────────────────────────────────────
function TeamCard({ member }: { member: TeamMember }) {
  const { profile, outfit, catalog } = member;
  const col = profile.avatar_color ?? "#00e5cc";
  return (
    <div className="relative group flex flex-col items-center gap-4 px-6 py-8"
      style={{
        background: "linear-gradient(135deg, rgba(0,229,204,0.04) 0%, rgba(0,10,20,0.8) 100%)",
        border: "1px solid rgba(0,229,204,0.15)",
        clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
      }}>
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-cyan-400/40" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }} />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-cyan-400/40" style={{ clipPath: "polygon(0 0, 0 100%, 100% 100%)" }} />

      {/* Avatar */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" style={{ background: col }} />
        <svg width="80" height="100" viewBox="-31 -40 62 80" style={{ overflow: "visible" }}>
          <defs>
            <filter id={`tm-${profile.id}`} colorInterpolationFilters="sRGB">
              <feFlood floodColor={col} result="flood" />
              <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask" />
              <feBlend in="mask" in2="SourceGraphic" mode="color" />
            </filter>
          </defs>
          <image href="/alien.png" x="-31" y="-36" width="62" height="77" filter={`url(#tm-${profile.id})`} />
          <ClothingOverlayLP outfit={outfit} catalog={catalog} />
        </svg>
      </div>

      {/* Name */}
      <div className="text-center">
        <p className="font-bold text-white text-[15px]" style={{ fontFamily: "var(--font-orbitron)" }}>{profile.username}</p>
        <p className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color: "#00e5cc", fontFamily: "var(--font-space-mono)" }}>// ADMIN</p>
      </div>

      {profile.bio && (
        <p className="text-[12px] text-center leading-relaxed max-w-[190px]" style={{ color: "rgba(180,210,220,0.7)" }}>{profile.bio}</p>
      )}
    </div>
  );
}

// ── FAQ item ────────────────────────────────────────────────────────────────────
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="transition-all" style={{ borderBottom: "1px solid rgba(0,229,204,0.08)" }}>
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-4 px-0 py-4 text-left group">
        <span style={{ fontFamily: "var(--font-space-mono)", color: "rgba(0,229,204,0.35)", fontSize: 11 }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex-1 text-[14px] font-semibold group-hover:text-cyan-300 transition-colors" style={{ color: open ? "#00e5cc" : "#c8d4e8" }}>{q}</span>
        <span className="text-[18px] transition-transform duration-200" style={{ color: "#00e5cc", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && (
        <div className="pb-4 pl-8 pr-2">
          <p className="text-[13px] leading-relaxed" style={{ color: "rgba(180,210,220,0.65)" }}>{a}</p>
        </div>
      )}
    </div>
  );
}

// ── Scan line overlay ───────────────────────────────────────────────────────────
function ScanLines() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]" style={{
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,204,1) 2px, rgba(0,229,204,1) 3px)",
      backgroundSize: "100% 4px",
    }} />
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [defaultRoom, setDefaultRoom] = useState<RoomMeta | null>(null);
  const [kickedBy, setKickedBy] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadUserData = useCallback(async (): Promise<boolean> => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;
    const user = session.user;
    const [{ data: p }, { data: rooms }, { data: spaceship }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("chat_rooms").select("id, name, cols, rows, is_default").order("created_at"),
      supabase.from("chat_rooms").select("id, name, cols, rows, owner_id").eq("room_type", "spaceship").eq("owner_id", user.id).maybeSingle(),
    ]);
    if (p) setProfile(p as Profile);
    if (spaceship) {
      setDefaultRoom({ ...(spaceship as RoomMeta), room_type: "spaceship" });
    } else if (rooms && rooms.length > 0) {
      const def = (rooms as RoomMeta[]).find(r => r.is_default) ?? rooms[0];
      setDefaultRoom(def as RoomMeta);
    }
    return true;
  }, []);

  useEffect(() => {
    loadUserData().then(loggedIn => { if (loggedIn) setChatOpen(true); });
  }, []); // eslint-disable-line

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: admins }, { data: catalog }] = await Promise.all([
        supabase.from("profiles").select("*").eq("role", "admin"),
        supabase.from("virtual_clothing_items").select("*"),
      ]);
      if (!admins || !catalog) { setTeamLoading(false); return; }
      const members: TeamMember[] = await Promise.all(
        (admins as Profile[]).map(async (admin) => {
          const { data: wData } = await supabase.from("virtual_user_wardrobe").select("clothing_id").eq("user_id", admin.id).eq("equipped", true);
          const outfit: Record<string, string> = {};
          (wData ?? []).forEach((w: { clothing_id: string }) => {
            const item = (catalog as ClothingItem[]).find(c => c.id === w.clothing_id);
            if (item) outfit[item.slot] = w.clothing_id;
          });
          return { profile: admin, outfit, catalog: catalog as ClothingItem[] };
        })
      );
      setTeamMembers(members);
      setTeamLoading(false);
    };
    load();
  }, []);

  const handleAuthSuccess = useCallback(async () => {
    await loadUserData();
  }, [loadUserData]);

  const features = [
    { icon: "👾", code: "AVATAR", title: "Alien Avatarer", desc: "Tilpas din alien med farver, tøj og accessories. Upload dit eget custom-tøj." },
    { icon: "💬", code: "REALTIME", title: "Live Chat", desc: "Talebobler direkte over din avatar. Ligesom de gamle chatspil — men i rummet." },
    { icon: "🚀", code: "ROOMS", title: "Isometriske Rum", desc: "Bevæg dig mellem 3D-lignende rum. Besøg andres rumskibe og udforsk universet." },
    { icon: "🪙", code: "ECONOMY", title: "Møntvaluta", desc: "Tjen mønter ved at chatte og spille. Brug dem i butikken på tøj og møbler." },
    { icon: "🏆", code: "ACHIEVE", title: "Bedrifter", desc: "Lås op for over 20 bedrifter. Klatr i niveau og vis dine præstationer frem." },
    { icon: "💑", code: "PARTNER", title: "Rumkæreste", desc: "Find din rumkæreste. I dukker begge op i et stjernefyldt hjerte på profilet." },
    { icon: "🎰", code: "GAMES", title: "Spil & Casino", desc: "Roulette, spilleautomat, piledart. Vind mønter og klatr på toplisterne." },
    { icon: "🛸", code: "SHIP", title: "Personligt Rumskib", desc: "Køb og møbler dit eget rumskib. Inviter venner ind — det er kun dit." },
  ];

  const faqs = [
    { q: "Er Zpace gratis?", a: "Ja — 100% gratis. Du tjener mønter bare ved at være aktiv, og alle basisfunktioner koster ingenting." },
    { q: "Skal jeg downloade noget?", a: "Nej. Zpace kører direkte i browseren. Åbn siden og kom igang med det samme." },
    { q: "Hvad er mønter til?", a: "Mønter er vores valuta. Tjen dem ved at chatte, logge ind og spille. Brug dem i butikken." },
    { q: "Kan jeg have mit eget rum?", a: "Ja! Køb et personligt rumskib som kun er dit. Møbler det og inviter venner ind." },
    { q: "Hvad er en rumkæreste?", a: "Send en anmodning til en anden bruger. Accepterer de, vises I begge i et hjerte på hinanden profiler." },
    { q: "Er der moderatorer?", a: "Ja, vi har et aktivt admin-hold. Upassende opførsel kan resultere i mute eller ban." },
    { q: "Hvad ser jeg ud som?", a: "Du er en farvet alien! Vælg farve ved oprettelse, og køb tøj og accessories efterfølgende." },
    { q: "Hvor mange kan være online?", a: "Ingen hård grænse. Rummene har naturligt loft, men du kan altid skifte rum." },
  ];

  return (
    <>
      <style>{`
        @keyframes float-a { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes glitch { 0%,100%{clip-path:inset(0 0 98% 0)} 10%{clip-path:inset(30% 0 50% 0)} 20%{clip-path:inset(70% 0 10% 0)} 30%{clip-path:inset(10% 0 80% 0)} 40%{clip-path:inset(60% 0 20% 0)} 50%{clip-path:inset(0 0 98% 0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .float-alien { animation: float-a 4s ease-in-out infinite; }
        .float-alien-2 { animation: float-a 5s 0.8s ease-in-out infinite; }
        .float-alien-3 { animation: float-a 3.5s 1.4s ease-in-out infinite; }
        .float-alien-4 { animation: float-a 4.5s 0.3s ease-in-out infinite; }
        .blink-cursor::after { content:'_'; animation: blink 1s step-end infinite; color: #00e5cc; }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .fade-up-1 { animation: fadeUp 0.6s 0.1s ease both; }
        .fade-up-2 { animation: fadeUp 0.6s 0.2s ease both; }
        .fade-up-3 { animation: fadeUp 0.6s 0.3s ease both; }
        .fade-up-4 { animation: fadeUp 0.6s 0.4s ease both; }
        .chamfer { clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px)); }
        .chamfer-sm { clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px)); }
        .grid-bg { background-image: linear-gradient(rgba(0,229,204,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,204,0.04) 1px, transparent 1px); background-size: 48px 48px; }
      `}</style>

      <div style={{ background: "#00040c", color: "#c8d4e8", fontFamily: "var(--font-syne, sans-serif)", minHeight: "100vh", overflowX: "hidden" }}>
        <ScanLines />

        {/* Grid background */}
        <div className="grid-bg pointer-events-none fixed inset-0 z-0 opacity-60" />

        {/* Nebula blobs */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div style={{ position: "absolute", top: "-15%", right: "-10%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,80,80,0.25) 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,40,60,0.3) 0%, transparent 70%)", filter: "blur(60px)" }} />
          <div style={{ position: "absolute", top: "40%", left: "30%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,69,0,0.06) 0%, transparent 70%)", filter: "blur(80px)" }} />
        </div>

        {/* ── NAV ── */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto fade-up">
          <div className="flex items-center gap-3">
            <div style={{ width: 36, height: 36, background: "#00e5cc", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-orbitron)", fontSize: 10, fontWeight: 900, color: "#00040c" }}>ZP</span>
            </div>
            <span style={{ fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: 16, color: "#00e5cc", letterSpacing: "0.15em" }}>ZPACE</span>
            <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 10, color: "rgba(0,229,204,0.4)", marginLeft: 4 }}>v2.0</span>
          </div>
          <div className="flex items-center gap-6">
            {["features", "faq", "holdet"].map(id => (
              <a key={id} href={`#${id}`} className="hidden sm:block text-[12px] uppercase tracking-widest transition-colors hover:text-cyan-300"
                style={{ fontFamily: "var(--font-space-mono)", color: "rgba(0,229,204,0.5)", letterSpacing: "0.15em" }}>
                {id}
              </a>
            ))}
            <button onClick={() => setChatOpen(true)}
              className="chamfer-sm px-5 py-2 transition-all hover:brightness-110 active:scale-95"
              style={{ background: "rgba(0,229,204,0.1)", border: "1px solid rgba(0,229,204,0.3)", color: "#00e5cc", fontFamily: "var(--font-space-mono)", fontSize: 11, letterSpacing: "0.1em" }}>
              [ LOG IND ]
            </button>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="relative z-10 max-w-7xl mx-auto px-8 pt-12 pb-32 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
          <div>
            <div className="fade-up flex items-center gap-3 mb-8">
              <div style={{ width: 8, height: 8, background: "#00e5cc", borderRadius: "50%", boxShadow: "0 0 12px #00e5cc", animation: "blink 2s step-end infinite" }} />
              <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 11, color: "rgba(0,229,204,0.6)", letterSpacing: "0.2em" }}>SYSTEM ONLINE · GRATIS · INGEN DOWNLOAD</span>
            </div>

            <h1 className="fade-up-1" style={{ fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 1.05, letterSpacing: "-0.02em", color: "#fff", marginBottom: "1.5rem" }}>
              TRÆD IND I<br />
              <span style={{ color: "#00e5cc", textShadow: "0 0 40px rgba(0,229,204,0.5), 0 0 80px rgba(0,229,204,0.2)" }}>ALIEN</span>
              <br />
              <span style={{ WebkitTextStroke: "1px rgba(255,255,255,0.3)", color: "transparent" }}>UNIVERSET</span>
            </h1>

            <p className="fade-up-2" style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(180,210,220,0.7)", maxWidth: 480, marginBottom: "2.5rem" }}>
              En virtuel verden med isometriske rum, alien-avatarer og realtime chat.
              Tilpas din karakter, tjen mønter og find din rumkæreste.
            </p>

            <div className="fade-up-3 flex flex-wrap gap-4 items-center">
              <button onClick={() => setChatOpen(true)}
                className="chamfer group relative px-8 py-4 transition-all hover:brightness-110 active:scale-95"
                style={{ background: "#00e5cc", color: "#00040c", fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: 13, letterSpacing: "0.1em", boxShadow: "0 0 40px rgba(0,229,204,0.4), 0 8px 32px rgba(0,229,204,0.2)" }}>
                👾 ÅBN CHATTEN
              </button>
              <a href="#features"
                className="flex items-center gap-2 transition-colors hover:text-cyan-300"
                style={{ color: "rgba(0,229,204,0.5)", fontFamily: "var(--font-space-mono)", fontSize: 12, letterSpacing: "0.1em" }}>
                SE FEATURES →
              </a>
            </div>

            {/* Stats row */}
            <div className="fade-up-4 flex gap-6 mt-12 pt-8" style={{ borderTop: "1px solid rgba(0,229,204,0.1)" }}>
              {[["20+", "BEDRIFTER"], ["8", "SPIL & FEATURES"], ["∞", "ALIEN LOOKS"]].map(([num, label]) => (
                <div key={label}>
                  <p style={{ fontFamily: "var(--font-orbitron)", fontSize: 24, fontWeight: 900, color: "#00e5cc" }}>{num}</p>
                  <p style={{ fontFamily: "var(--font-space-mono)", fontSize: 9, color: "rgba(0,229,204,0.45)", letterSpacing: "0.15em", marginTop: 2 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: aliens floating */}
          <div className="relative h-80 lg:h-[480px] pointer-events-none select-none">
            {/* HUD circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(0,229,204,0.1)", position: "absolute" }} />
              <div style={{ width: 240, height: 240, borderRadius: "50%", border: "1px solid rgba(0,229,204,0.06)", position: "absolute" }} />
              {/* Rotating dashes */}
              <div style={{ width: 380, height: 380, borderRadius: "50%", border: "1px dashed rgba(0,229,204,0.07)", position: "absolute", animation: "float-a 20s linear infinite" }} />
            </div>

            {[
              { color: "#00e5cc", cls: "float-alien",   style: { bottom: "10%", left: "15%"  }, scale: 1.3 },
              { color: "#ff6b35", cls: "float-alien-2", style: { top: "5%",    right: "20%"  }, scale: 1.0 },
              { color: "#7dff4f", cls: "float-alien-3", style: { top: "30%",   left: "5%"   }, scale: 0.75 },
              { color: "#ff3399", cls: "float-alien-4", style: { top: "10%",   left: "40%"  }, scale: 0.7  },
              { color: "#ffcc00", cls: "float-alien",   style: { bottom: "5%", right: "10%"  }, scale: 0.8  },
            ].map((a, i) => (
              <div key={i} className={`absolute ${a.cls}`} style={{ ...a.style, filter: `drop-shadow(0 0 20px ${a.color}80)` }}>
                <AlienFigure color={a.color} scale={a.scale} />
              </div>
            ))}

            {/* Corner HUD markers */}
            {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-5 h-5`}
                style={{ border: `2px solid rgba(0,229,204,0.3)`, borderRadius: 2,
                  borderRight: pos.includes("right") ? undefined : "none",
                  borderBottom: pos.includes("bottom") ? undefined : "none",
                  borderTop: pos.includes("top") ? undefined : "none",
                  borderLeft: pos.includes("left") ? undefined : "none",
                }} />
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 pb-28">
          <div className="mb-14 flex items-end justify-between">
            <div>
              <p style={{ fontFamily: "var(--font-space-mono)", fontSize: 10, color: "rgba(0,229,204,0.5)", letterSpacing: "0.25em", marginBottom: 10 }}>// SYSTEM MODULES</p>
              <h2 style={{ fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: "clamp(1.8rem, 4vw, 3rem)", color: "#fff", letterSpacing: "-0.02em" }}>ALT HVAD DU<br />BEHØVER</h2>
            </div>
            <div style={{ width: 60, height: 1, background: "linear-gradient(to right, rgba(0,229,204,0.5), transparent)" }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "rgba(0,229,204,0.06)" }}>
            {features.map(({ icon, code, title, desc }, i) => (
              <div key={title} className="group relative p-6 transition-all hover:z-10"
                style={{ background: "#00040c" }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,229,204,0.03)" }} />
                <p style={{ fontFamily: "var(--font-space-mono)", fontSize: 9, color: "rgba(0,229,204,0.35)", letterSpacing: "0.2em", marginBottom: 12 }}>
                  {String(i + 1).padStart(2, "0")}_{code}
                </p>
                <div className="text-3xl mb-3">{icon}</div>
                <p className="font-bold mb-2" style={{ fontFamily: "var(--font-orbitron)", fontSize: 12, color: "#fff", letterSpacing: "0.05em" }}>{title}</p>
                <p style={{ fontSize: 12, color: "rgba(180,210,220,0.55)", lineHeight: 1.7 }}>{desc}</p>
                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(to right, transparent, rgba(0,229,204,0.5), transparent)" }} />
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="relative z-10 max-w-3xl mx-auto px-8 pb-28">
          <p style={{ fontFamily: "var(--font-space-mono)", fontSize: 10, color: "rgba(0,229,204,0.5)", letterSpacing: "0.25em", marginBottom: 10 }}>// FREQUENTLY ASKED</p>
          <h2 className="mb-12" style={{ fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: "clamp(1.8rem, 4vw, 2.5rem)", color: "#fff" }}>SPØRGSMÅL</h2>
          <div>
            {faqs.map((item, i) => <FaqItem key={item.q} q={item.q} a={item.a} index={i} />)}
          </div>
        </section>

        {/* ── TEAM ── */}
        <section id="holdet" className="relative z-10 max-w-7xl mx-auto px-8 pb-28">
          <p style={{ fontFamily: "var(--font-space-mono)", fontSize: 10, color: "rgba(0,229,204,0.5)", letterSpacing: "0.25em", marginBottom: 10 }}>// HOLDET BAG ZPACE</p>
          <h2 className="mb-12" style={{ fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: "clamp(1.8rem, 4vw, 2.5rem)", color: "#fff" }}>MØD ADMIN-HOLDET</h2>

          {teamLoading ? (
            <div className="flex gap-2 py-12">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full" style={{ background: "#00e5cc", animation: `blink 1s ${i * 0.2}s step-end infinite` }} />
              ))}
            </div>
          ) : teamMembers.length === 0 ? (
            <p style={{ color: "rgba(0,229,204,0.3)", fontFamily: "var(--font-space-mono)", fontSize: 12 }}>// ingen admins fundet</p>
          ) : (
            <div className="flex flex-wrap gap-6">
              {teamMembers.map(m => <TeamCard key={m.profile.id} member={m} />)}
            </div>
          )}
        </section>

        {/* ── CTA FOOTER ── */}
        <section className="relative z-10 px-8 pb-24">
          <div className="chamfer max-w-3xl mx-auto p-12 text-center" style={{ background: "linear-gradient(135deg, rgba(0,229,204,0.06) 0%, rgba(0,10,20,0.9) 100%)", border: "1px solid rgba(0,229,204,0.2)" }}>
            <p style={{ fontFamily: "var(--font-space-mono)", fontSize: 10, color: "rgba(0,229,204,0.5)", letterSpacing: "0.25em", marginBottom: 16 }}>// KLAR TIL OPSENDELSE?</p>
            <h2 className="mb-4" style={{ fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: "clamp(1.5rem, 4vw, 2.5rem)", color: "#fff" }}>LETTE NU</h2>
            <p className="mb-8" style={{ fontSize: 14, color: "rgba(180,210,220,0.6)" }}>Opret en gratis konto og vær en del af alien-universet på sekunder.</p>
            <button onClick={() => setChatOpen(true)}
              className="chamfer px-10 py-4 transition-all hover:brightness-110 active:scale-95"
              style={{ background: "#00e5cc", color: "#00040c", fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: 13, letterSpacing: "0.1em", boxShadow: "0 0 40px rgba(0,229,204,0.4), 0 8px 32px rgba(0,229,204,0.2)" }}>
              👾 ÅBN CHATTEN NU
            </button>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="relative z-10 text-center py-8" style={{ borderTop: "1px solid rgba(0,229,204,0.06)" }}>
          <p style={{ fontFamily: "var(--font-space-mono)", fontSize: 10, color: "rgba(0,229,204,0.2)", letterSpacing: "0.15em" }}>
            © {new Date().getFullYear()} ZPACE · BYGGET MED ❤ I DET YDRE RUM
          </p>
        </footer>
      </div>

      {/* ── Kicked overlay ── */}
      {kickedBy && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(8px)" }}>
          <div className="chamfer p-10 max-w-sm w-[90%] text-center" style={{ background: "#00040c", border: "1px solid rgba(255,69,0,0.4)", boxShadow: "0 0 60px rgba(255,69,0,0.15)" }}>
            <p className="text-5xl mb-4">🚫</p>
            <p style={{ fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: 18, color: "#ff4500", marginBottom: 8 }}>DU ER KICKET</p>
            <p style={{ fontSize: 13, color: "rgba(180,210,220,0.6)", marginBottom: 20 }}>af <span style={{ color: "#ff4500" }}>{kickedBy}</span></p>
            <button onClick={() => window.location.reload()}
              className="chamfer-sm w-full py-3 transition-all hover:brightness-110"
              style={{ background: "rgba(255,69,0,0.15)", border: "1px solid rgba(255,69,0,0.3)", color: "#ff4500", fontFamily: "var(--font-orbitron)", fontSize: 12, letterSpacing: "0.1em" }}>
              GENINDLÆS
            </button>
          </div>
        </div>
      )}

      {/* ── Auth / Chat popups ── */}
      {chatOpen && !profile && (
        <ChatGateway onAuthSuccess={handleAuthSuccess} onClose={() => setChatOpen(false)} />
      )}
      {chatOpen && profile && defaultRoom && (
        <VirtualRoom
          roomId={defaultRoom.id}
          roomName={defaultRoom.name}
          initialRoomType={defaultRoom.room_type}
          initialRoomOwnerId={defaultRoom.owner_id}
          currentProfile={profile}
          onClose={() => setChatOpen(false)}
          onKicked={(by) => { setChatOpen(false); setKickedBy(by); }}
        />
      )}
    </>
  );
}
