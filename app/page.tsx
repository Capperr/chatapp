"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { VirtualRoom } from "@/components/chat/VirtualRoom";
import { ChatGateway } from "@/components/chat/ChatGateway";
import type { Profile } from "@/types";

interface RoomMeta { id: string; name: string; cols: number; rows: number; is_default: boolean; room_type?: string; owner_id?: string | null; }

// ─── Tiny alien SVG used on the landing page ──────────────────────────────────
function AlienFigure({ color, scale = 1 }: { color: string; scale?: number }) {
  const filterId = `lp-tint-${color.slice(1)}`;
  return (
    <svg width={62 * scale} height={77 * scale} viewBox="-31 -36 62 77" style={{ overflow: "visible" }}>
      <defs>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feFlood floodColor={color} result="flood" />
          <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask" />
          <feBlend in="mask" in2="SourceGraphic" mode="color" />
        </filter>
      </defs>
      <ellipse cx="0" cy="38" rx="16" ry="4.5" fill="rgba(0,0,0,0.3)" />
      <image href="/alien.png" x="-31" y="-36" width="62" height="77" filter={`url(#${filterId})`} />
    </svg>
  );
}

// ─── FAQ accordion item ───────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl transition-all ${open ? "border-violet-500/30 bg-violet-500/[0.04]" : "border-white/[0.07] bg-white/[0.02]"}`}>
      <button onClick={() => setOpen(p => !p)} className="w-full flex items-center justify-between px-5 py-4 text-left gap-4">
        <span className="text-[14px] font-semibold text-slate-200">{q}</span>
        <svg className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${open ? "rotate-45" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
      {open && <p className="px-5 pb-5 text-[13px] text-slate-400 leading-relaxed">{a}</p>}
    </div>
  );
}

// ─── Admin team card ──────────────────────────────────────────────────────────
interface TeamMember { profile: Profile; outfit: Record<string, string>; catalog: ClothingItem[]; }
interface ClothingItem { id: string; name: string; slot: string; style_key: string; color?: string | null; image_url?: string | null; img_x?: number | null; img_y?: number | null; img_w?: number | null; img_h?: number | null; }

function ClothingLayerSVG({ styleKey, color }: { styleKey: string; color?: string | null }) {
  const c = color ?? "#8b5cf6";
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

function TeamCard({ member }: { member: TeamMember }) {
  const { profile, outfit, catalog } = member;
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-8 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-violet-500/25 hover:bg-violet-500/[0.03] transition-all group">
      {/* Avatar */}
      <div className="w-20 h-24 rounded-xl overflow-hidden flex items-end justify-center" style={{ background: (profile.avatar_color ?? "#8b5cf6") + "18", border: `1px solid ${profile.avatar_color ?? "#8b5cf6"}40` }}>
        <svg width="64" height="80" viewBox="-18 -36 36 56" style={{ overflow: "visible" }}>
          <defs>
            <filter id={`team-tint-${profile.id}`} colorInterpolationFilters="sRGB">
              <feFlood floodColor={profile.avatar_color ?? "#8b5cf6"} result="flood" />
              <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask" />
              <feBlend in="mask" in2="SourceGraphic" mode="color" />
            </filter>
          </defs>
          <image href="/alien.png" x="-31" y="-36" width="62" height="77" filter={`url(#team-tint-${profile.id})`} />
          <ClothingOverlayLP outfit={outfit} catalog={catalog} />
        </svg>
      </div>
      {/* Name + role */}
      <div className="text-center">
        <p className="text-[15px] font-bold text-white">{profile.display_name}</p>
        <p className="text-[11px] text-violet-400 font-semibold uppercase tracking-widest mt-0.5">Admin</p>
      </div>
      {/* Bio */}
      {profile.bio && (
        <p className="text-[13px] text-slate-400 text-center leading-relaxed max-w-[200px]">{profile.bio}</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [defaultRoom, setDefaultRoom] = useState<RoomMeta | null>(null);
  const [kickedBy, setKickedBy] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

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

  // Load admin team members + their wardrobes
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
    { icon: "👾", title: "Isometriske rum", desc: "Bevæg dig rundt i 3D-lignende rum med din personlige alien-avatar. Besøg andres rum og udforsk universet." },
    { icon: "💬", title: "Realtime chat", desc: "Skriv med andre brugere i realtid. Talebobler vises direkte over din avatar — ligesom i de gamle chat-spil." },
    { icon: "🎨", title: "Tilpas din alien", desc: "Vælg farve, køb tøj og accessories til din avatar. Upload dit eget tøj som billede for et helt unikt look." },
    { icon: "🪙", title: "Møntvaluta & butik", desc: "Tjen mønter ved at chatte, spille og være online. Brug dem i butikken på tøj, accessories og mere." },
    { icon: "🚀", title: "Personligt rumskib", desc: "Køb og indret dit eget rumskib. Inviter venner ind og dekorer det med møbler og genstande." },
    { icon: "🎰", title: "Spil & underholdning", desc: "Prøv lykken ved spilleautomaten, roulette eller piledart. Vind mønter og klatre op på toplisterne." },
    { icon: "🏆", title: "Bedrifter & niveauer", desc: "Lås op for over 20 unikke bedrifter. Stieg i niveau ved at chatte og være aktiv i fællesskabet." },
    { icon: "💑", title: "Rumkærester", desc: "Find en rumkæreste! Send en anmodning til en anden bruger — I vises begge i et stjernefyldt hjerte." },
  ];

  const faqs = [
    { q: "Er Zpace gratis?", a: "Ja! Det er 100% gratis at oprette en konto og deltage i chatten. Du tjener mønter bare ved at være aktiv, og de fleste features koster ingenting." },
    { q: "Skal jeg downloade noget?", a: "Nej. Zpace kører direkte i din browser — ingen installation nødvendig. Åbn siden og kom igang med det samme." },
    { q: "Hvordan ser jeg ud i chatten?", a: "Du er en farvet alien! Du vælger din farve ved oprettelse, og kan efterfølgende købe tøj og accessories i butikken for at personliggøre dit look." },
    { q: "Hvad er mønter til?", a: "Mønter er vores valuta. Du tjener dem ved at chatte, logge ind dagligt og spille spil. Brug dem i butikken på tøj, hårfarver og accessories til din avatar." },
    { q: "Kan jeg have mit eget rum?", a: "Ja! Du kan købe et personligt rumskib som kun er dit. Inviter venner ind og møbler det med genstande fra din inventar." },
    { q: "Hvad er rumkærester?", a: "Du kan sende en rumkæreste-anmodning til en anden bruger. Hvis de accepterer, vises I begge i et stjernefyldt hjerte på hinandens profiler." },
    { q: "Er der moderatorer?", a: "Ja, vi har et aktivt admin-hold der holder øje med chatten. Du kan se teamet nedenfor. Upassende opførsel kan resultere i en mute eller ban." },
    { q: "Hvor mange kan være online samtidig?", a: "Der er ingen hård grænse. Rummene har et naturligt loft baseret på tilgængelig plads, men du kan altid skifte til et andet rum." },
  ];

  return (
    <>
      {/* ── Landing page ── */}
      <div className="min-h-screen bg-[#030912] text-white overflow-x-hidden">

        {/* ── Animated star field ── */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          {Array.from({ length: 120 }).map((_, i) => {
            const x = (i * 137.508 + 23) % 100;
            const y = (i * 91.34 + 17) % 100;
            const s = i % 7 === 0 ? 2.5 : i % 4 === 0 ? 1.5 : 1;
            const dur = 2 + (i % 5) * 0.7;
            const delay = (i * 0.18) % 5;
            return (
              <div key={i} className="absolute rounded-full bg-white"
                style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, opacity: 0.15 + (i % 4) * 0.07,
                  animation: `pulse ${dur}s ${delay}s ease-in-out infinite alternate` }} />
            );
          })}
          {/* Nebula glows */}
          <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] rounded-full bg-violet-600/8 blur-[140px]" />
          <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[110px]" />
          <div className="absolute top-[40%] left-[35%] w-[400px] h-[400px] rounded-full bg-cyan-600/5 blur-[100px]" />
          <div className="absolute top-[20%] right-[15%] w-[300px] h-[300px] rounded-full bg-pink-600/5 blur-[90px]" />
        </div>

        {/* ── Nav ── */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
            </div>
            <span className="text-white font-bold text-[15px] tracking-tight">Zpace</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="text-[13px] text-slate-400 hover:text-white transition-colors hidden sm:block">Features</a>
            <a href="#faq" className="text-[13px] text-slate-400 hover:text-white transition-colors hidden sm:block">FAQ</a>
            <a href="#holdet" className="text-[13px] text-slate-400 hover:text-white transition-colors hidden sm:block">Holdet</a>
            <button onClick={() => setChatOpen(true)}
              className="text-[13px] text-slate-400 hover:text-white transition-colors font-medium">
              Log ind
            </button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-32">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[12px] font-semibold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Live nu · Gratis · Ingen download
          </div>

          {/* Floating aliens */}
          <div className="relative w-full max-w-lg mx-auto mb-8 h-32 pointer-events-none select-none">
            {[
              { color: "#8b5cf6", x: "8%",  y: "10%", scale: 1.0, delay: "0s" },
              { color: "#06b6d4", x: "22%", y: "30%", scale: 0.75, delay: "1.2s" },
              { color: "#ec4899", x: "72%", y: "5%",  scale: 0.9, delay: "0.6s" },
              { color: "#f59e0b", x: "85%", y: "35%", scale: 0.7, delay: "1.8s" },
              { color: "#10b981", x: "50%", y: "0%",  scale: 0.65, delay: "0.9s" },
            ].map((a, i) => (
              <div key={i} className="absolute" style={{ left: a.x, top: a.y,
                animation: `float-alien ${3 + i * 0.4}s ${a.delay} ease-in-out infinite alternate`,
                filter: `drop-shadow(0 4px 16px ${a.color}50)` }}>
                <AlienFigure color={a.color} scale={a.scale} />
              </div>
            ))}
          </div>

          <style>{`
            @keyframes float-alien {
              from { transform: translateY(0px); }
              to   { transform: translateY(-14px); }
            }
          `}</style>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 max-w-3xl">
            Træd ind i{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              alien-universet
            </span>
          </h1>

          <p className="text-slate-400 text-lg sm:text-xl max-w-xl mb-10 leading-relaxed">
            En virtuel verden med isometriske rum, alien-avatarer og realtime chat.
            Tilpas din karakter, tjen mønter og find din rumkæreste.
          </p>

          <button
            onClick={() => setChatOpen(true)}
            className="group relative inline-flex items-center gap-3 px-10 py-4.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-[17px] shadow-[0_8px_40px_rgba(124,58,237,0.5)] hover:shadow-[0_12px_56px_rgba(124,58,237,0.7)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            style={{ paddingTop: "1.1rem", paddingBottom: "1.1rem" }}
          >
            <span>👾 Åben chatten og kom igang nu</span>
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/80 group-hover:translate-x-0.5 transition-transform">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
            </svg>
          </button>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2.5 mt-10">
            {["👾 Alien avatarer","🪙 Møntvaluta & butik","🚀 Virtuelle rum","⚡ Realtime chat","🏆 Bedrifter","💑 Rumkærester"].map(label => (
              <div key={label} className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-slate-400 text-[12px] font-medium">
                {label}
              </div>
            ))}
          </div>

          {/* Planet decoration */}
          <div className="absolute right-[5%] top-[15%] w-16 h-16 rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 35%, #818cf8, #312e81)", boxShadow: "0 0 40px 10px rgba(99,102,241,0.3)" }} />
          <div className="absolute left-[3%] bottom-[20%] w-10 h-10 rounded-full opacity-15 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 35%, #67e8f9, #0e7490)", boxShadow: "0 0 30px 8px rgba(8,145,178,0.3)" }} />
        </section>

        {/* ── Features ── */}
        <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold text-violet-400 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Alt hvad du behøver for at have det sjovt</h2>
            <p className="text-slate-500 mt-3 max-w-lg mx-auto text-[15px]">Zpace er fyldt med features der gør det sjovt at chatte og udforske universet.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 hover:bg-violet-500/[0.03] transition-all">
                <div className="text-3xl">{icon}</div>
                <p className="text-[14px] font-bold text-slate-100">{title}</p>
                <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="relative z-10 max-w-3xl mx-auto px-6 pb-28">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold text-cyan-400 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ofte stillede spørgsmål</h2>
          </div>
          <div className="space-y-2.5">
            {faqs.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </section>

        {/* ── Team ── */}
        <section id="holdet" className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold text-pink-400 uppercase tracking-widest mb-3">Holdet bag</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Mød admin-holdet</h2>
            <p className="text-slate-500 mt-3 max-w-lg mx-auto text-[15px]">Disse aliens holder chatten kørende. Find dem i rummet og sig hej!</p>
          </div>

          {teamLoading ? (
            <div className="flex justify-center py-12">
              <div className="flex gap-2">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : teamMembers.length === 0 ? (
            <p className="text-center text-slate-600">Ingen admins fundet.</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-6">
              {teamMembers.map(m => <TeamCard key={m.profile.id} member={m} />)}
            </div>
          )}
        </section>

        {/* ── Footer CTA ── */}
        <section className="relative z-10 text-center px-6 pb-24">
          <div className="inline-flex flex-col items-center gap-6 px-10 py-10 rounded-3xl bg-gradient-to-b from-violet-500/10 to-indigo-500/5 border border-violet-500/20 max-w-lg mx-auto">
            <div className="text-4xl">🚀</div>
            <h2 className="text-2xl font-extrabold text-white">Klar til at lette?</h2>
            <p className="text-slate-400 text-[14px]">Opret en gratis konto og vær en del af alien-universet på sekunder.</p>
            <button onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-[15px] shadow-[0_6px_28px_rgba(124,58,237,0.45)] hover:shadow-[0_10px_40px_rgba(124,58,237,0.65)] hover:scale-[1.03] active:scale-[0.98] transition-all">
              👾 Åben chatten og kom igang nu
            </button>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center">
          <p className="text-[12px] text-slate-700">© {new Date().getFullYear()} Zpace · Bygget med ❤️ i det ydre rum</p>
        </footer>
      </div>

      {/* ── Animated background when chat is open ── */}
      {chatOpen && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          <style>{`
            @keyframes orb1{0%,100%{transform:translate(0,0)}40%{transform:translate(50px,-70px)}80%{transform:translate(-30px,40px)}}
            @keyframes orb2{0%,100%{transform:translate(0,0)}35%{transform:translate(-60px,40px)}70%{transform:translate(40px,-50px)}}
            @keyframes orb3{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,55px)}}
          `}</style>
          <div style={{ animation: "orb1 14s ease-in-out infinite" }} className="absolute top-[-8%] left-[-4%] w-[480px] h-[480px] rounded-full bg-violet-600/12 blur-[90px]" />
          <div style={{ animation: "orb2 18s ease-in-out infinite" }} className="absolute bottom-[-8%] right-[-4%] w-[420px] h-[420px] rounded-full bg-indigo-500/10 blur-[80px]" />
          <div style={{ animation: "orb3 11s ease-in-out infinite" }} className="absolute top-[35%] right-[20%] w-[260px] h-[260px] rounded-full bg-cyan-500/6 blur-[60px]" />
        </div>
      )}

      {/* ── Kicked overlay ── */}
      {kickedBy && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 px-8 py-8 bg-[#070f1e] border border-rose-500/30 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.9)] max-w-sm w-[90%] text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-3xl">🚫</div>
            <div>
              <p className="text-[18px] font-bold text-white mb-1">Du er blevet kicket</p>
              <p className="text-[14px] text-slate-400">af <span className="text-rose-300 font-semibold">{kickedBy}</span></p>
            </div>
            <p className="text-[13px] text-slate-500">Du skal genindlæse siden for at komme tilbage i chatten.</p>
            <button onClick={() => window.location.reload()}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 rounded-xl text-[14px] font-bold text-white transition-colors">
              Genindlæs siden
            </button>
          </div>
        </div>
      )}

      {/* ── Auth popup ── */}
      {chatOpen && !profile && (
        <ChatGateway onAuthSuccess={handleAuthSuccess} onClose={() => setChatOpen(false)} />
      )}

      {/* ── Chat popup ── */}
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
