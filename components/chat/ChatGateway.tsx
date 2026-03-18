"use client";

import { useState, useEffect } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const REG_COLORS = ["#00e5cc","#ff6b35","#7dff4f","#ff3399","#ffcc00","#3b82f6","#a855f7","#ef4444","#ec4899","#14b8a6"];

// ─── Mini isometric room preview ───────────────────────────────────────────────
const PTW = 46, PTH = 23;  // tile width + height
const PWH = 30;             // wall height
const COLS = 5, ROWS = 5;
const A_SCALE = 0.46;       // alien scale

function rTile(gx: number, gy: number) {
  return { x: (gx - gy) * (PTW / 2), y: (gx + gy) * (PTH / 2) };
}

const A1_PATH = [
  {gx:0,gy:0},{gx:1,gy:0},{gx:2,gy:0},{gx:3,gy:0},{gx:4,gy:0},
  {gx:4,gy:1},{gx:4,gy:2},{gx:4,gy:3},{gx:4,gy:4},
  {gx:3,gy:4},{gx:2,gy:4},{gx:1,gy:4},{gx:0,gy:4},
  {gx:0,gy:3},{gx:0,gy:2},{gx:0,gy:1},
];

const A2_PATH = [
  {gx:1,gy:1},{gx:2,gy:1},{gx:3,gy:1},
  {gx:3,gy:2},{gx:3,gy:3},
  {gx:2,gy:3},{gx:1,gy:3},
  {gx:1,gy:2},
];

const BUBBLES = ["Hej! 👋", "Kom med ind!", "Zpace er fedt 🚀", "👾 Klik opret!"];

function IsometricRoomPreview({ color }: { color: string }) {
  const [a1i, setA1i] = useState(0);
  const [a2i, setA2i] = useState(3);
  const [bubbleIdx, setBubbleIdx] = useState(0);
  const [bubbleVis, setBubbleVis] = useState(true);

  useEffect(() => {
    const t1 = setInterval(() => setA1i(i => (i + 1) % A1_PATH.length), 900);
    const t2 = setInterval(() => setA2i(i => (i + 1) % A2_PATH.length), 1300);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setBubbleVis(false);
      setTimeout(() => { setBubbleIdx(i => (i + 1) % BUBBLES.length); setBubbleVis(true); }, 280);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const a1 = A1_PATH[a1i]; const a2 = A2_PATH[a2i];
  const aw = 62 * A_SCALE; const ah = 77 * A_SCALE;

  // Floor tiles sorted back→front
  const tiles: {gx:number;gy:number}[] = [];
  for (let gx = 0; gx < COLS; gx++) for (let gy = 0; gy < ROWS; gy++) tiles.push({gx, gy});
  tiles.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  // Wall points
  const lw = [
    {x: rTile(0,0).x,                         y: rTile(0,0).y - PWH},
    {x: rTile(0,ROWS-1).x - PTW/2,            y: rTile(0,ROWS-1).y + PTH/2 - PWH},
    {x: rTile(0,ROWS-1).x - PTW/2,            y: rTile(0,ROWS-1).y + PTH/2},
    {x: rTile(0,0).x,                         y: rTile(0,0).y},
  ];
  const rw = [
    {x: rTile(0,0).x,                         y: rTile(0,0).y - PWH},
    {x: rTile(COLS-1,0).x + PTW/2,            y: rTile(COLS-1,0).y + PTH/2 - PWH},
    {x: rTile(COLS-1,0).x + PTW/2,            y: rTile(COLS-1,0).y + PTH/2},
    {x: rTile(0,0).x,                         y: rTile(0,0).y},
  ];
  const poly = (pts: {x:number;y:number}[]) => pts.map(p => `${p.x},${p.y}`).join(' ');

  // IsoBox helper
  const IsoBox = ({ gx, gy, bh, top, left, right }: { gx:number;gy:number;bh:number;top:string;left:string;right:string }) => {
    const {x, y} = rTile(gx, gy); const hw = PTW/2, hh = PTH/2;
    return (
      <g>
        <polygon points={`${x},${y+PTH} ${x+hw},${y+hh} ${x+hw},${y+hh+bh} ${x},${y+PTH+bh}`} fill={right} />
        <polygon points={`${x-hw},${y+hh} ${x},${y+PTH} ${x},${y+PTH+bh} ${x-hw},${y+hh+bh}`} fill={left} />
        <polygon points={`${x},${y} ${x+hw},${y+hh} ${x},${y+PTH} ${x-hw},${y+hh}`} fill={top} />
      </g>
    );
  };

  // Alien group helper
  const AlienG = ({ gx, gy, fid }: {gx:number;gy:number;fid:string}) => {
    const {x, y} = rTile(gx, gy);
    const tx = x, ty = y + PTH;
    return (
      <g style={{ transform: `translate(${tx}px, ${ty}px)`, transition: "transform 0.75s cubic-bezier(0.4,0,0.2,1)" }}>
        <ellipse cx={0} cy={2} rx={10} ry={3} fill="rgba(0,0,0,0.35)" />
        <image href="/alien.png" x={-aw/2} y={-ah} width={aw} height={ah} filter={`url(#${fid})`} />
      </g>
    );
  };

  // Speech bubble group
  const a1pos = rTile(a1.gx, a1.gy);
  const bx = a1pos.x, by = a1pos.y + PTH - ah - 18;
  const bubText = BUBBLES[bubbleIdx];
  const bw = Math.max(48, bubText.length * 5.2 + 14);

  // Sort aliens for depth
  const alienDepth = [
    { gx: a1.gx, gy: a1.gy, fid: "gw-a1" },
    { gx: a2.gx, gy: a2.gy, fid: "gw-a2" },
  ].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  // Furniture depth sort items
  const furniture: {gx:number;gy:number;depth:number;el:React.ReactNode}[] = [
    { gx:1, gy:0, depth:1, el: (
      <g key="tv">
        <IsoBox gx={1} gy={0} bh={20} top="rgba(0,70,100,0.95)" left="rgba(0,30,55,0.95)" right="rgba(0,50,80,0.95)" />
        {(() => { const {x,y}=rTile(1,0); return <>
          <rect x={x-9} y={y-PTH/2+2} width={18} height={12} rx={1} fill="rgba(0,229,204,0.12)" stroke="rgba(0,229,204,0.35)" strokeWidth={0.5} />
          <rect x={x-7} y={y-PTH/2+4} width={14} height={8} rx={0.5} fill="rgba(0,229,204,0.25)" />
        </>; })()}
      </g>
    )},
    { gx:3, gy:3, depth:6, el: (
      <IsoBox key="couch" gx={3} gy={3} bh={13} top="rgba(0,120,100,0.85)" left="rgba(0,65,55,0.9)" right="rgba(0,90,75,0.85)" />
    )},
    { gx:0, gy:2, depth:2, el: (
      <IsoBox key="lamp" gx={0} gy={2} bh={24} top="rgba(255,200,50,0.3)" left="rgba(30,20,0,0.8)" right="rgba(50,30,0,0.8)" />
    )},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "100%" }}>
      <svg viewBox="-115 -42 230 175" style={{ width: "100%", maxWidth: 420, overflow: "visible" }}>
        <defs>
          <filter id="gw-a1" colorInterpolationFilters="sRGB">
            <feFlood floodColor={color} result="flood"/>
            <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask"/>
            <feBlend in="mask" in2="SourceGraphic" mode="color"/>
          </filter>
          <filter id="gw-a2" colorInterpolationFilters="sRGB">
            <feFlood floodColor="#ff6b35" result="flood"/>
            <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask"/>
            <feBlend in="mask" in2="SourceGraphic" mode="color"/>
          </filter>
        </defs>

        {/* Left wall */}
        <polygon points={poly(lw)} fill="rgba(0,25,45,0.9)" stroke="rgba(0,229,204,0.07)" strokeWidth={0.5} />
        {/* Right wall */}
        <polygon points={poly(rw)} fill="rgba(0,15,35,0.9)" stroke="rgba(0,229,204,0.07)" strokeWidth={0.5} />
        {/* Wall top glow lines */}
        <line x1={lw[0].x} y1={lw[0].y} x2={lw[1].x} y2={lw[1].y} stroke="rgba(0,229,204,0.18)" strokeWidth={0.8} />
        <line x1={rw[0].x} y1={rw[0].y} x2={rw[1].x} y2={rw[1].y} stroke="rgba(0,229,204,0.18)" strokeWidth={0.8} />

        {/* Floor tiles */}
        {tiles.map(({gx, gy}) => {
          const {x, y} = rTile(gx, gy); const hw=PTW/2, hh=PTH/2;
          const alt = (gx+gy) % 2 === 0;
          return (
            <polygon key={`t${gx}${gy}`}
              points={`${x},${y} ${x+hw},${y+hh} ${x},${y+PTH} ${x-hw},${y+hh}`}
              fill={alt ? "rgba(0,45,65,0.75)" : "rgba(0,32,50,0.75)"}
              stroke="rgba(0,229,204,0.09)" strokeWidth={0.5}
            />
          );
        })}

        {/* TV furniture (early - depth 1) */}
        {furniture.filter(f => f.depth <= 2).map(f => f.el)}

        {/* Lamp */}
        {furniture.find(f => f.gx===0 && f.gy===2)?.el}

        {/* Aliens (sorted back→front) + couch mixed in */}
        {alienDepth[0] && <AlienG gx={alienDepth[0].gx} gy={alienDepth[0].gy} fid={alienDepth[0].fid} />}
        {furniture.find(f => f.gx===3 && f.gy===3)?.el}
        {alienDepth[1] && <AlienG gx={alienDepth[1].gx} gy={alienDepth[1].gy} fid={alienDepth[1].fid} />}

        {/* Speech bubble above alien 1 */}
        <g style={{ transform: `translate(${bx}px, ${by}px)`, transition: "transform 0.75s cubic-bezier(0.4,0,0.2,1)", opacity: bubbleVis ? 1 : 0 }}>
          <rect x={-bw/2} y={-16} width={bw} height={16} rx={5} fill="white" />
          <polygon points={`-4,0 4,0 0,5`} fill="white" />
          <text x={0} y={-4} textAnchor="middle" fontSize={7.5} fontFamily="system-ui,sans-serif" fontWeight="700" fill="#111">{bubText}</text>
        </g>

        {/* Floor edge highlight */}
        {(() => {
          const fl = rTile(0, ROWS-1); const fr = rTile(COLS-1, 0);
          const fb = rTile(COLS-1, ROWS-1);
          return <>
            <line x1={fl.x-PTW/2} y1={fl.y+PTH/2} x2={fb.x} y2={fb.y+PTH} stroke="rgba(0,229,204,0.12)" strokeWidth={0.8} />
            <line x1={fr.x+PTW/2} y1={fr.y+PTH/2} x2={fb.x} y2={fb.y+PTH} stroke="rgba(0,229,204,0.12)" strokeWidth={0.8} />
          </>;
        })()}
      </svg>

      {/* HUD label */}
      <div style={{ fontFamily: "var(--font-space-mono, monospace)", fontSize: 9, color: "rgba(0,229,204,0.4)", letterSpacing: "0.2em", marginTop: 6 }}>
        // LIVE PREVIEW · ZPACE ROM
      </div>
    </div>
  );
}

interface ChatGatewayProps {
  onAuthSuccess?: () => void;
  onClose?: () => void;
}

export function ChatGateway({ onAuthSuccess, onClose }: ChatGatewayProps = {}) {
  const supabase = createClient();

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [banInfo, setBanInfo] = useState<{ reason: string; expiresAt: string | null } | null>(null);

  const [showReg, setShowReg] = useState(false);
  const [regData, setRegData] = useState({ username: "", email: "", password: "" });
  const [regColor, setRegColor] = useState("#00e5cc");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    const { data: email } = await supabase.rpc("get_email_by_username", { p_username: loginUsername.trim().toLowerCase() });
    if (!email) {
      setLoginError("BRUGERNAVN IKKE FUNDET");
      setLoginLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: loginPassword });
    if (error) {
      setLoginError("FORKERT BRUGERNAVN ELLER ADGANGSKODE");
      setLoginLoading(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("is_banned, ban_reason, ban_expires_at").eq("username", loginUsername.trim().toLowerCase()).maybeSingle();
    if (profile?.is_banned) {
      if (profile.ban_expires_at && new Date(profile.ban_expires_at) <= new Date()) {
        await supabase.from("profiles").update({ is_banned: false, ban_reason: null, ban_expires_at: null }).eq("username", loginUsername.trim().toLowerCase());
      } else {
        await supabase.auth.signOut();
        setBanInfo({ reason: profile.ban_reason ?? "Ingen årsag opgivet", expiresAt: profile.ban_expires_at ?? null });
        setLoginLoading(false);
        return;
      }
    }
    await supabase.rpc("record_login_ip");
    if (onAuthSuccess) { onAuthSuccess(); } else { window.location.reload(); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    const { data: ipCheck } = await supabase.rpc("check_ip_ban");
    if (ipCheck?.banned) {
      setRegError("DU ER UDELUKKET FRA AT OPRETTE NYE BRUGERE.");
      setRegLoading(false);
      return;
    }
    const { data: existing } = await supabase.from("profiles").select("username").eq("username", regData.username.toLowerCase()).maybeSingle();
    if (existing) {
      setRegError("BRUGERNAVNET ER ALLEREDE TAGET.");
      setRegLoading(false);
      return;
    }
    const { error: signUpError } = await supabase.auth.signUp({
      email: regData.email,
      password: regData.password,
      options: {
        data: { username: regData.username.toLowerCase(), display_name: regData.username, avatar_color: regColor },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (signUpError) {
      const msg = signUpError.message.includes("already registered") ? "E-MAILEN ER ALLEREDE REGISTRERET."
        : signUpError.message.includes("Password") ? "ADGANGSKODEN SKAL VÆRE MINDST 6 TEGN."
        : "DER OPSTOD EN FEJL. PRØV IGEN.";
      setRegError(msg);
      setRegLoading(false);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: regData.email, password: regData.password });
    if (!signInError) {
      if (onAuthSuccess) { onAuthSuccess(); } else { window.location.href = "/"; }
      return;
    }
    setRegSuccess(true);
    setRegLoading(false);
  };

  const banExpiryText = (expiresAt: string | null) => {
    if (!expiresAt) return "PERMANENT UDELUKKELSE";
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "UDLØBET";
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (days > 0) return `OPHÆVES OM ${days} DAG${days !== 1 ? "E" : ""} OG ${hours} TIME${hours !== 1 ? "R" : ""}`;
    if (hours > 0) return `OPHÆVES OM ${hours} TIME${hours !== 1 ? "R" : ""} OG ${mins} MIN`;
    return `OPHÆVES OM ${mins} MIN`;
  };

  const inputStyle = {
    width: "100%",
    background: "rgba(0,229,204,0.04)",
    border: "1px solid rgba(0,229,204,0.15)",
    borderRadius: 0,
    padding: "8px 12px",
    fontSize: 12,
    color: "#c8d4e8",
    outline: "none",
    fontFamily: "var(--font-space-mono, monospace)",
    letterSpacing: "0.05em",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    fontFamily: "var(--font-space-mono, monospace)",
    fontSize: 9,
    color: "rgba(0,229,204,0.45)",
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    display: "block",
    marginBottom: 6,
  };

  if (banInfo) return (
    <>
      <style>{`
        @keyframes gw-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes gw-float { from{transform:translateY(0)} to{transform:translateY(-10px)} }
        @keyframes gw-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}>
        <div style={{ background: "#000a14", border: "1px solid rgba(255,69,0,0.4)", padding: "40px 32px", maxWidth: 400, width: "100%", textAlign: "center", clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))", boxShadow: "0 0 60px rgba(255,69,0,0.15)" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🚫</p>
          <p style={{ fontFamily: "var(--font-orbitron, monospace)", fontWeight: 900, fontSize: 16, color: "#ff4500", marginBottom: 4, letterSpacing: "0.1em" }}>ADGANG NÆGTET</p>
          <p style={{ fontFamily: "var(--font-space-mono, monospace)", fontSize: 11, color: "rgba(255,69,0,0.6)", marginBottom: 20, letterSpacing: "0.1em" }}>{banExpiryText(banInfo.expiresAt)}</p>
          <div style={{ background: "rgba(255,69,0,0.05)", border: "1px solid rgba(255,69,0,0.15)", padding: "12px 16px", marginBottom: 20, textAlign: "left" }}>
            <p style={{ fontFamily: "var(--font-space-mono, monospace)", fontSize: 9, color: "rgba(255,69,0,0.4)", letterSpacing: "0.2em", marginBottom: 6 }}>// ÅRSAG</p>
            <p style={{ fontSize: 13, color: "#c8d4e8", lineHeight: 1.6 }}>{banInfo.reason}</p>
          </div>
          <button onClick={() => setBanInfo(null)} style={{ background: "rgba(255,69,0,0.1)", border: "1px solid rgba(255,69,0,0.25)", color: "rgba(255,69,0,0.7)", fontFamily: "var(--font-space-mono, monospace)", fontSize: 11, padding: "8px 20px", cursor: "pointer", letterSpacing: "0.15em", width: "100%" }}>
            [ LUK ]
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @keyframes gw-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes gw-float { from{transform:translateY(0)} to{transform:translateY(-10px)} }
        @keyframes gw-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes gw-scan { 0%{top:-2px} 100%{top:100%} }
        .gw-input:focus { border-color: rgba(0,229,204,0.5) !important; background: rgba(0,229,204,0.07) !important; }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,2,8,0.88)", backdropFilter: "blur(16px)" }}
        onClick={onClose}>

        <div className="flex items-stretch" onClick={e => e.stopPropagation()}>

          {/* ── Main window ── */}
          <div style={{
            width: "min(96vw, 1280px)",
            height: "min(94vh, 900px)",
            background: "#000a14",
            border: "1px solid rgba(0,229,204,0.15)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            clipPath: showReg ? undefined : "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))",
            boxShadow: "0 0 80px rgba(0,229,204,0.08), 0 32px 80px rgba(0,0,0,0.8)",
          }}>
            {/* Scan line sweep */}
            <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(to right, transparent, rgba(0,229,204,0.3), transparent)", animation: "gw-scan 4s linear infinite", zIndex: 0, pointerEvents: "none" }} />

            {/* ── Header bar ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px",
              background: "rgba(0,229,204,0.04)",
              borderBottom: "1px solid rgba(0,229,204,0.1)",
              flexShrink: 0, zIndex: 1,
            }}>
              {/* Logo */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginRight: 4 }}>
                <div style={{ width: 28, height: 28, background: "#00e5cc", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "var(--font-orbitron, monospace)", fontSize: 8, fontWeight: 900, color: "#000a14" }}>ZP</span>
                </div>
                <span style={{ fontFamily: "var(--font-orbitron, monospace)", fontWeight: 900, fontSize: 13, color: "#00e5cc", letterSpacing: "0.15em" }} className="hidden sm:block">ZPACE</span>
              </div>

              <div style={{ width: 1, height: 20, background: "rgba(0,229,204,0.1)", flexShrink: 0 }} />

              {/* Login form */}
              <form onSubmit={handleLogin} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-space-mono, monospace)", fontSize: 11, color: "rgba(0,229,204,0.4)", pointerEvents: "none" }}>@</span>
                  <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)}
                    placeholder="brugernavn" required autoComplete="username"
                    className="gw-input" style={{ ...inputStyle, paddingLeft: 26 }} />
                </div>
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "rgba(0,229,204,0.4)", pointerEvents: "none" }}>🔒</span>
                  <input type={showLoginPw ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    placeholder="adgangskode" required autoComplete="current-password"
                    className="gw-input" style={{ ...inputStyle, paddingLeft: 28, paddingRight: 32 }} />
                  <button type="button" onClick={() => setShowLoginPw(p => !p)}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(0,229,204,0.3)", padding: 0 }}>
                    {showLoginPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button type="submit" disabled={loginLoading}
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#00e5cc", border: "none", cursor: loginLoading ? "default" : "pointer", color: "#000a14", fontFamily: "var(--font-orbitron, monospace)", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", opacity: loginLoading ? 0.7 : 1, transition: "opacity 0.2s" }}>
                  {loginLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  LOG IND
                </button>
              </form>

              {loginError && (
                <span style={{ fontFamily: "var(--font-space-mono, monospace)", fontSize: 10, color: "#ff4500", flexShrink: 0, maxWidth: 160, letterSpacing: "0.05em" }}>{loginError}</span>
              )}

              <div style={{ width: 1, height: 20, background: "rgba(0,229,204,0.1)", flexShrink: 0 }} />

              {/* Register toggle */}
              <button onClick={() => setShowReg(p => !p)}
                style={{ flexShrink: 0, padding: "7px 14px", background: showReg ? "rgba(0,229,204,0.1)" : "rgba(0,229,204,0.06)", border: `1px solid ${showReg ? "rgba(0,229,204,0.3)" : "rgba(0,229,204,0.12)"}`, cursor: "pointer", color: showReg ? "#00e5cc" : "rgba(0,229,204,0.5)", fontFamily: "var(--font-space-mono, monospace)", fontSize: 10, letterSpacing: "0.1em", transition: "all 0.2s" }}>
                [ OPRET ]
              </button>

              {/* Close */}
              <button onClick={onClose ?? (() => { window.location.href = "/"; })}
                style={{ flexShrink: 0, padding: "6px 8px", background: "none", border: "none", cursor: "pointer", color: "rgba(0,229,204,0.3)", fontSize: 16, transition: "color 0.2s", lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* ── Body: animated isometric room ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "radial-gradient(ellipse at 50% 60%, #001a28 0%, #000a14 100%)" }}>
              {/* Ambient glow under room */}
              <div style={{ position: "absolute", bottom: "15%", left: "50%", transform: "translateX(-50%)", width: 300, height: 80, background: `radial-gradient(ellipse, ${regColor}18 0%, transparent 70%)`, filter: "blur(20px)", pointerEvents: "none" }} />

              <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, padding: "20px 24px 0" }}>
                <div style={{ marginBottom: 12, textAlign: "center" }}>
                  <h2 style={{ fontFamily: "var(--font-orbitron, monospace)", fontWeight: 900, fontSize: 20, color: "#fff", marginBottom: 3, letterSpacing: "-0.01em" }}>
                    VELKOMMEN TIL <span style={{ color: "#00e5cc" }}>ZPACE</span>
                  </h2>
                  <p style={{ fontFamily: "var(--font-space-mono, monospace)", fontSize: 9, color: "rgba(0,229,204,0.4)", letterSpacing: "0.2em" }}>
                    // VIRTUEL ALIEN-VERDEN · LOG IND FOR AT TILSLUTTE DIG
                  </p>
                </div>
                <IsometricRoomPreview color={regColor} />
              </div>
            </div>
          </div>

          {/* ── Register side panel ── */}
          {showReg && (
            <div style={{
              width: 280,
              height: "min(94vh, 900px)",
              background: "#000a14",
              borderTop: "1px solid rgba(0,229,204,0.15)",
              borderRight: "1px solid rgba(0,229,204,0.15)",
              borderBottom: "1px solid rgba(0,229,204,0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)",
            }}>
              {regSuccess ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 36 }}>✅</div>
                  <div>
                    <p style={{ fontFamily: "var(--font-orbitron, monospace)", fontSize: 13, color: "#00e5cc", fontWeight: 900, marginBottom: 8 }}>TJEK DIN E-MAIL</p>
                    <p style={{ fontFamily: "var(--font-space-mono, monospace)", fontSize: 10, color: "rgba(0,229,204,0.5)", lineHeight: 1.7 }}>
                      Bekræftelseslink sendt til<br />
                      <span style={{ color: "rgba(0,229,204,0.8)" }}>{regData.email}</span>
                    </p>
                  </div>
                  <button onClick={() => setRegSuccess(false)} style={{ fontFamily: "var(--font-space-mono, monospace)", fontSize: 10, color: "rgba(0,229,204,0.5)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em" }}>
                    [ PRØ IGEN ]
                  </button>
                </div>
              ) : (
                <>
                  {/* Panel header */}
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,229,204,0.08)", flexShrink: 0 }}>
                    <p style={{ fontFamily: "var(--font-orbitron, monospace)", fontSize: 11, fontWeight: 900, color: "#00e5cc", letterSpacing: "0.1em" }}>OPRET KONTO</p>
                    <p style={{ fontFamily: "var(--font-space-mono, monospace)", fontSize: 9, color: "rgba(0,229,204,0.35)", letterSpacing: "0.15em", marginTop: 3 }}>// GRATIS · KLAR PÅ FÅ SEK</p>
                  </div>

                  {/* Alien color picker */}
                  <div style={{ padding: "16px", borderBottom: "1px solid rgba(0,229,204,0.06)", flexShrink: 0, background: "rgba(0,229,204,0.02)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <svg width="70" height="80" viewBox="-31 -40 62 80" style={{ overflow: "visible" }}>
                      <defs>
                        <filter id={`reg-${regColor.replace("#","")}`} colorInterpolationFilters="sRGB">
                          <feFlood floodColor={regColor} result="flood"/>
                          <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask"/>
                          <feBlend in="mask" in2="SourceGraphic" mode="color"/>
                        </filter>
                      </defs>
                      <ellipse cx="0" cy="36" rx="18" ry="5" fill="rgba(0,0,0,0.4)" />
                      <image href="/alien.png" x="-31" y="-36" width="62" height="77" filter={`url(#reg-${regColor.replace("#","")})`} style={{ animation: "gw-float 3s ease-in-out infinite alternate" }} />
                    </svg>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                      {REG_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setRegColor(c)}
                          style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: `2px solid ${regColor === c ? "#fff" : "transparent"}`, cursor: "pointer", boxShadow: regColor === c ? `0 0 8px ${c}` : "none", transition: "all 0.15s" }} />
                      ))}
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleRegister} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    {regError && (
                      <div style={{ padding: "8px 12px", background: "rgba(255,69,0,0.08)", border: "1px solid rgba(255,69,0,0.2)", color: "#ff4500", fontFamily: "var(--font-space-mono, monospace)", fontSize: 9, letterSpacing: "0.05em", lineHeight: 1.6 }}>
                        {regError}
                      </div>
                    )}

                    <div>
                      <label style={labelStyle}>// BRUGERNAVN</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-space-mono)", fontSize: 11, color: "rgba(0,229,204,0.35)", pointerEvents: "none" }}>@</span>
                        <input type="text" value={regData.username} onChange={e => setRegData(p => ({ ...p, username: e.target.value }))}
                          placeholder="bruger123" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+"
                          className="gw-input" style={{ ...inputStyle, paddingLeft: 26 }} />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>// E-MAIL</label>
                      <input type="email" value={regData.email} onChange={e => setRegData(p => ({ ...p, email: e.target.value }))}
                        placeholder="din@email.dk" required autoComplete="email"
                        className="gw-input" style={inputStyle} />
                    </div>

                    <div>
                      <label style={labelStyle}>// ADGANGSKODE</label>
                      <div style={{ position: "relative" }}>
                        <input type={showRegPw ? "text" : "password"} value={regData.password} onChange={e => setRegData(p => ({ ...p, password: e.target.value }))}
                          placeholder="mindst 6 tegn" required minLength={6} autoComplete="new-password"
                          className="gw-input" style={{ ...inputStyle, paddingRight: 32 }} />
                        <button type="button" onClick={() => setShowRegPw(p => !p)}
                          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(0,229,204,0.3)", padding: 0 }}>
                          {showRegPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {/* Password strength */}
                      <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                        {[6, 8, 12].map(len => (
                          <div key={len} style={{ flex: 1, height: 2, background: regData.password.length >= len ? "#00e5cc" : "rgba(0,229,204,0.08)", transition: "background 0.3s" }} />
                        ))}
                      </div>
                    </div>

                    <button type="submit" disabled={regLoading}
                      style={{ width: "100%", padding: "10px", background: regLoading ? "rgba(0,229,204,0.3)" : "#00e5cc", border: "none", cursor: regLoading ? "default" : "pointer", color: "#000a14", fontFamily: "var(--font-orbitron, monospace)", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
                      {regLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      OPRET GRATIS KONTO
                    </button>

                    <p style={{ fontFamily: "var(--font-space-mono, monospace)", fontSize: 9, color: "rgba(0,229,204,0.25)", textAlign: "center", letterSpacing: "0.05em" }}>
                      Har du en konto? Log ind i toppen.
                    </p>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
