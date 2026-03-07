"use client";

import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, User, X, CheckCircle, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const REG_COLORS = ["#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#3b82f6","#84cc16","#f97316","#14b8a6"];

const SPEECH_BUBBLES = [
  "Hej! 👋",
  "Er du klar på en rejse igennem galaxen?",
  "Opret dig nu og vær en del af vores alien univers!",
];

// ─── Alien hero with cycling speech bubbles ────────────────────────────────────
function AlienHero({ color }: { color: string }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % SPEECH_BUBBLES.length); setFade(true); }, 280);
    }, 3600);
    return () => clearInterval(t);
  }, []);

  const filterId = `gw-tint-${color.slice(1)}`;
  const text = SPEECH_BUBBLES[idx];

  // Wrap text into lines of max ~22 chars
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length > 22 && cur) { lines.push(cur); cur = w; } else { cur = candidate; }
  }
  if (cur) lines.push(cur);

  const lineH = 16;
  const padH = 14; const padV = 9;
  const bw = Math.max(80, lines.reduce((m, l) => Math.max(m, l.length), 0) * 6.8 + padH * 2);
  const bh = lines.length * lineH + padV * 2;
  // Bubble sits above the alien head (head top is near y=0 in local space)
  const bx = 0; const by = -bh - 20;

  return (
    <svg width="240" height="300" viewBox="-60 -180 120 220" style={{ overflow: "visible" }}>
      <defs>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feFlood floodColor={color} result="flood"/>
          <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask"/>
          <feBlend in="mask" in2="SourceGraphic" mode="color"/>
        </filter>
      </defs>

      {/* Speech bubble */}
      <g style={{ opacity: fade ? 1 : 0, transition: "opacity 0.28s ease" }}>
        <rect x={bx - bw / 2} y={by} width={bw} height={bh} rx={12} fill="white" />
        <rect x={bx - bw / 2 + 2} y={by + 2} width={bw} height={bh} rx={12} fill="rgba(0,0,0,0.15)" style={{ transform: `translate(0, 2px)` }} />
        <rect x={bx - bw / 2} y={by} width={bw} height={bh} rx={12} fill="white" stroke="rgba(139,92,246,0.2)" strokeWidth={1} />
        <polygon points={`${bx - 8},${by + bh} ${bx + 8},${by + bh} ${bx},${by + bh + 10}`} fill="white" />
        {lines.map((line, i) => (
          <text key={i} x={bx} y={by + padV + 12 + i * lineH} textAnchor="middle" fontSize={11} fontFamily="system-ui,sans-serif" fontWeight="700" fill="#111827">{line}</text>
        ))}
      </g>

      {/* Alien shadow */}
      <ellipse cx={0} cy={36} rx={22} ry={6} fill="rgba(0,0,0,0.35)" />
      {/* Alien image with color tint */}
      <image href="/alien.png" x="-31" y="-36" width="62" height="77" filter={`url(#${filterId})`} />
    </svg>
  );
}

interface ChatGatewayProps {
  onAuthSuccess?: () => void;
  onClose?: () => void;
}

// ─── Main ChatGateway component ────────────────────────────────────────────────
export function ChatGateway({ onAuthSuccess, onClose }: ChatGatewayProps = {}) {
  const supabase = createClient();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register panel state
  const [showReg, setShowReg] = useState(false);
  const [regData, setRegData] = useState({ username: "", displayName: "", email: "", password: "" });
  const [regColor, setRegColor] = useState("#8b5cf6");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) {
      setLoginError("Forkert e-mail eller adgangskode");
      setLoginLoading(false);
      return;
    }
    if (onAuthSuccess) { onAuthSuccess(); } else { window.location.href = "/"; }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    const { data: existing } = await supabase.from("profiles").select("username")
      .eq("username", regData.username.toLowerCase()).maybeSingle();
    if (existing) {
      setRegError("Brugernavnet er allerede taget.");
      setRegLoading(false);
      return;
    }
    const { error: signUpError } = await supabase.auth.signUp({
      email: regData.email,
      password: regData.password,
      options: {
        data: {
          username: regData.username.toLowerCase(),
          display_name: regData.displayName || regData.username,
          avatar_color: regColor,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (signUpError) {
      const msg = signUpError.message.includes("already registered")
        ? "E-mailen er allerede registreret."
        : signUpError.message.includes("Password")
        ? "Adgangskoden skal være mindst 6 tegn."
        : "Der opstod en fejl. Prøv igen.";
      setRegError(msg);
      setRegLoading(false);
      return;
    }
    // Try auto sign-in (works if email confirmation is disabled)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: regData.email,
      password: regData.password,
    });
    if (!signInError) {
      if (onAuthSuccess) { onAuthSuccess(); } else { window.location.href = "/"; }
      return;
    }
    setRegSuccess(true);
    setRegLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" onClick={onClose}>
      {/* Outer flex wrapper so register panel can extend to the right */}
      <div className="flex items-stretch" onClick={e => e.stopPropagation()}>

        {/* ── Main window ── */}
        <div
          className={`relative z-10 flex flex-col border border-white/[0.1] bg-gradient-to-b from-[#060d1a] to-[#04090f] shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_120px_rgba(99,102,241,0.07)] ${showReg ? "rounded-l-2xl rounded-r-none" : "rounded-2xl"}`}
          style={{ width: "min(96vw, 780px)", height: "min(88vh, 620px)" }}
        >
          {/* ── Header ── */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-[#040c19]/95 border-b border-violet-500/20 shadow-[0_1px_0_rgba(99,102,241,0.06),0_4px_24px_rgba(0,0,0,0.4)]" style={{ borderRadius: showReg ? "16px 0 0 0" : "16px 16px 0 0" }}>
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0 mr-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                </svg>
              </div>
              <span className="text-white font-bold text-[13px] tracking-tight hidden sm:block">ChatApp</span>
            </div>
            <div className="w-px h-5 bg-white/[0.08] flex-shrink-0" />

            {/* Inline login form */}
            <form onSubmit={handleLogin} className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="E-mail" required autoComplete="email"
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500/50 focus:bg-white/[0.08] transition-all" />
              </div>
              <div className="relative flex-1 min-w-0">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input type={showLoginPw ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Adgangskode" required autoComplete="current-password"
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-8 pr-8 py-1.5 text-[12px] text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500/50 focus:bg-white/[0.08] transition-all" />
                <button type="button" onClick={() => setShowLoginPw(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                  {showLoginPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button type="submit" disabled={loginLoading}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 rounded-lg text-[12px] text-white font-semibold transition-colors shadow-[0_2px_8px_rgba(124,58,237,0.4)]">
                {loginLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Log ind
              </button>
            </form>

            {loginError && <span className="text-[11px] text-rose-400 flex-shrink-0 max-w-[120px] truncate">{loginError}</span>}

            <div className="w-px h-5 bg-white/[0.08] flex-shrink-0" />

            {/* Opret button */}
            <button
              onClick={() => setShowReg(p => !p)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${showReg ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_2px_8px_rgba(99,102,241,0.4)]"}`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Opret
            </button>

            <button onClick={onClose ?? (() => { window.location.href = "/"; })} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] transition-all flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body: alien hero center ── */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 60%, #0a0f1e 0%, #04060d 100%)" }}>
            {/* Stars */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 80 }).map((_, i) => {
                const x = (i * 137.5 + 17) % 100;
                const y = (i * 91.3 + 33) % 100;
                const s = i % 5 === 0 ? 2 : 1;
                return <div key={i} className="absolute rounded-full bg-white" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, opacity: 0.25 + (i % 3) * 0.1, animation: `pulse ${2 + (i % 3)}s ${(i * 0.3) % 4}s ease-in-out infinite alternate` }} />;
              })}
            </div>

            <div className="relative flex flex-col items-center gap-2">
              <h2 className="text-2xl font-extrabold text-white leading-tight text-center">
                Velkommen til{" "}
                <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">ChatApp</span>
              </h2>

              {/* Animated alien */}
              <AlienHero color="#8b5cf6" />

              <div className="flex gap-3 mt-2">
                {[{ emoji: "👾", label: "Aliens" }, { emoji: "🪙", label: "Mønter" }, { emoji: "🚀", label: "Rumskibe" }, { emoji: "⚡", label: "Realtime" }].map(({ emoji, label }) => (
                  <div key={label} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-slate-500 text-[11px]">
                    <span>{emoji}</span>{label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Register side panel ── */}
        {showReg && (
          <div className="w-72 flex flex-col bg-[#030912]/98 border border-l-0 border-white/[0.1] rounded-r-2xl overflow-hidden shadow-[16px_0_40px_rgba(0,0,0,0.6)]" style={{ height: "min(88vh, 620px)" }}>
            {regSuccess ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-200 mb-1">Tjek din e-mail!</p>
                  <p className="text-[11px] text-slate-500">Vi har sendt en bekræftelseslink til <span className="text-slate-300">{regData.email}</span></p>
                </div>
                <button onClick={() => setRegSuccess(false)} className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">Prøv igen</button>
              </div>
            ) : (
              <>
                {/* Panel header */}
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                  <div>
                    <p className="text-[12px] font-bold text-slate-200">Opret gratis konto</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Klar på få sekunder</p>
                  </div>
                  <button onClick={() => setShowReg(false)} className="text-slate-600 hover:text-slate-300 transition-colors"><X className="w-4 h-4" /></button>
                </div>

                {/* Alien preview with selected color */}
                <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-3 border-b border-white/[0.06] bg-gradient-to-b from-violet-500/[0.04] to-transparent">
                  <svg width="90" height="100" viewBox="-31 -50 62 80">
                    <defs>
                      <filter id={`reg-tint-${regColor.slice(1)}`} colorInterpolationFilters="sRGB">
                        <feFlood floodColor={regColor} result="flood"/>
                        <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask"/>
                        <feBlend in="mask" in2="SourceGraphic" mode="color"/>
                      </filter>
                    </defs>
                    <ellipse cx="0" cy="28" rx="16" ry="4.5" fill="rgba(0,0,0,0.35)" />
                    <image href="/alien.png" x="-31" y="-36" width="62" height="77" filter={`url(#reg-tint-${regColor.slice(1)})`} />
                  </svg>
                  <div className="flex gap-1.5 mt-2 flex-wrap justify-center px-3">
                    {REG_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setRegColor(c)}
                        className="w-5 h-5 rounded-full transition-all border-2 flex-shrink-0"
                        style={{ backgroundColor: c, borderColor: regColor === c ? "white" : "transparent", boxShadow: regColor === c ? `0 0 6px ${c}` : "none" }}
                      />
                    ))}
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleRegister} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {regError && (
                    <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">{regError}</div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Brugernavn</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[11px]">@</span>
                      <input type="text" value={regData.username} onChange={e => setRegData(p => ({ ...p, username: e.target.value }))} placeholder="bruger123" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+"
                        className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg pl-7 pr-3 py-1.5 text-[12px] text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500/50 transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Visningsnavn</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                      <input type="text" value={regData.displayName} onChange={e => setRegData(p => ({ ...p, displayName: e.target.value }))} placeholder="Jens Jensen" maxLength={50}
                        className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500/50 transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                      <input type="email" value={regData.email} onChange={e => setRegData(p => ({ ...p, email: e.target.value }))} placeholder="din@email.dk" required autoComplete="email"
                        className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500/50 transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Adgangskode</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                      <input type={showRegPw ? "text" : "password"} value={regData.password} onChange={e => setRegData(p => ({ ...p, password: e.target.value }))} placeholder="Mindst 6 tegn" required minLength={6} autoComplete="new-password"
                        className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg pl-8 pr-8 py-1.5 text-[12px] text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500/50 transition-all" />
                      <button type="button" onClick={() => setShowRegPw(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                        {showRegPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="flex gap-1 pt-0.5">
                      {[6, 8, 12].map(len => (
                        <div key={len} className={`h-0.5 flex-1 rounded-full transition-all ${regData.password.length >= len ? "bg-violet-500" : "bg-white/[0.06]"}`} />
                      ))}
                    </div>
                  </div>

                  <button type="submit" disabled={regLoading}
                    className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 rounded-lg text-[12px] text-white font-semibold transition-all shadow-[0_4px_16px_rgba(124,58,237,0.35)] flex items-center justify-center gap-2 mt-1">
                    {regLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Opret konto gratis
                  </button>

                  <p className="text-center text-[10px] text-slate-700 pb-1">Har du en konto? Log ind i toppen.</p>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
