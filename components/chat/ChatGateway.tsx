"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail, Lock, Eye, EyeOff, Loader2, User, X, CheckCircle, ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Decorative static isometric scene ────────────────────────────────────────
function IsoPreview() {
  const tiles = [
    { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 2, gy: 0 },
    { gx: 0, gy: 1 }, { gx: 1, gy: 1 }, { gx: 2, gy: 1 },
    { gx: 0, gy: 2 }, { gx: 1, gy: 2 }, { gx: 2, gy: 2 },
  ];
  const TW = 60; const TH = 30; const OX = 200; const OY = 80;
  const center = (gx: number, gy: number) => ({
    x: (gx - gy) * (TW / 2) + OX,
    y: (gx + gy) * (TH / 2) + OY,
  });
  const pts = (cx: number, cy: number) =>
    `${cx},${cy - TH / 2} ${cx + TW / 2},${cy} ${cx},${cy + TH / 2} ${cx - TW / 2},${cy}`;

  const avatars = [
    { gx: 0, gy: 1, color: "#8b5cf6" },
    { gx: 1, gy: 0, color: "#06b6d4" },
    { gx: 2, gy: 2, color: "#f59e0b" },
  ];

  return (
    <svg viewBox="0 0 400 260" className="w-full h-full" style={{ maxHeight: 260 }}>
      {tiles.map(({ gx, gy }) => {
        const { x, y } = center(gx, gy);
        const even = (gx + gy) % 2 === 0;
        return (
          <polygon key={`${gx},${gy}`} points={pts(x, y)}
            fill={even ? "#0f1a2e" : "#0c1525"} stroke="#16243a" strokeWidth={0.7} />
        );
      })}
      {avatars.map(({ gx, gy, color }) => {
        const { x, y } = center(gx, gy);
        return (
          <g key={`${gx},${gy}`} transform={`translate(${x}, ${y - 20})`}>
            <ellipse cx={0} cy={14} rx={10} ry={3} fill="rgba(0,0,0,0.4)" />
            <ellipse cx={0} cy={-8} rx={5} ry={3.5} fill={color} stroke="white" strokeWidth={0.6} />
            <circle cx={0} cy={-2} r={5.5} fill="#f5c5a3" stroke="white" strokeWidth={0.6} />
            <rect x={-5.5} y={3} width={11} height={9} rx={2} fill={color} stroke="white" strokeWidth={0.6} />
          </g>
        );
      })}
      {/* Simple speech bubble on one avatar */}
      <g>
        <rect x={220} y={52} width={70} height={22} rx={6} fill="white" />
        <polygon points="235,74 245,74 240,80" fill="white" />
        <text x={255} y={67} textAnchor="middle" fontSize={9} fontWeight="600" fill="#0f172a">Hej! 👋</text>
      </g>
    </svg>
  );
}

// ─── Main ChatGateway component ────────────────────────────────────────────────
export function ChatGateway() {
  const router = useRouter();
  const supabase = createClient();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register state
  const [regData, setRegData] = useState({ username: "", displayName: "", email: "", password: "" });
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
    router.push("/chat");
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
      router.push("/chat");
      return;
    }
    setRegSuccess(true);
    setRegLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#030912] flex items-center justify-center p-4">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[80px]" />
      </div>

      {/* Chat window */}
      <div
        className="relative z-10 flex flex-col rounded-2xl overflow-hidden border border-white/[0.1] bg-gradient-to-b from-[#060d1a] to-[#04090f] shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_120px_rgba(99,102,241,0.07)]"
        style={{ width: "min(96vw, 1040px)", height: "min(88vh, 660px)" }}
      >
        {/* ── Header (login area) ── */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-[#040c19]/95 border-b border-violet-500/20 shadow-[0_1px_0_rgba(99,102,241,0.06),0_4px_24px_rgba(0,0,0,0.4)]">
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
          <form onSubmit={handleLogin} className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-0">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="E-mail"
                required
                autoComplete="email"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500/50 focus:bg-white/[0.08] transition-all"
              />
            </div>
            <div className="relative flex-1 min-w-0">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                type={showLoginPw ? "text" : "password"}
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="Adgangskode"
                required
                autoComplete="current-password"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-8 pr-8 py-1.5 text-[12px] text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500/50 focus:bg-white/[0.08] transition-all"
              />
              <button type="button" onClick={() => setShowLoginPw(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                {showLoginPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button type="submit" disabled={loginLoading}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 rounded-lg text-[12px] text-white font-semibold transition-colors shadow-[0_2px_8px_rgba(124,58,237,0.4)]">
              {loginLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Log ind
            </button>
          </form>

          {loginError && (
            <span className="text-[11px] text-rose-400 flex-shrink-0 max-w-[140px] truncate">{loginError}</span>
          )}

          <a href="/" className="ml-2 p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] transition-all flex-shrink-0" title="Tilbage">
            <ArrowLeft className="w-4 h-4" />
          </a>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: decorative preview */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 overflow-hidden" style={{ background: "#0f1a2e" }}>
            <div className="text-center max-w-xs">
              <h2 className="text-2xl font-extrabold text-white mb-2 leading-tight">
                Velkommen til{" "}
                <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                  ChatApp
                </span>
              </h2>
              <p className="text-slate-500 text-[13px] leading-relaxed">
                En virtuel verden med isometriske rum, avatarer og live chat. Log ind i toppen eller opret en konto til højre.
              </p>
            </div>
            <div className="w-full max-w-sm opacity-70">
              <IsoPreview />
            </div>
            <div className="flex gap-3">
              {[{ emoji: "🎭", label: "Avatarer" }, { emoji: "🪙", label: "Mønter" }, { emoji: "⚡", label: "Realtime" }].map(({ emoji, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-500 text-[11px]">
                  <span>{emoji}</span>{label}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: registration */}
          <div className="w-64 flex-shrink-0 flex flex-col bg-[#030912]/95 border-l border-white/[0.07]">
            {regSuccess ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-200 mb-1">Tjek din e-mail!</p>
                  <p className="text-[11px] text-slate-500">Vi har sendt en bekræftelseslink til <span className="text-slate-300">{regData.email}</span></p>
                </div>
                <button onClick={() => setRegSuccess(false)} className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
                  Prøv igen
                </button>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
                  <p className="text-[11px] font-bold text-slate-300">Ny? Opret gratis konto</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Klar på få sekunder</p>
                </div>

                <form onSubmit={handleRegister} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {regError && (
                    <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
                      {regError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Brugernavn</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[11px]">@</span>
                      <input
                        type="text"
                        value={regData.username}
                        onChange={e => setRegData(p => ({ ...p, username: e.target.value }))}
                        placeholder="bruger123"
                        required
                        minLength={3}
                        maxLength={30}
                        pattern="[a-zA-Z0-9_]+"
                        className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg pl-7 pr-3 py-1.5 text-[12px] text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Visningsnavn</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                      <input
                        type="text"
                        value={regData.displayName}
                        onChange={e => setRegData(p => ({ ...p, displayName: e.target.value }))}
                        placeholder="Jens Jensen"
                        maxLength={50}
                        className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                      <input
                        type="email"
                        value={regData.email}
                        onChange={e => setRegData(p => ({ ...p, email: e.target.value }))}
                        placeholder="din@email.dk"
                        required
                        autoComplete="email"
                        className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Adgangskode</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                      <input
                        type={showRegPw ? "text" : "password"}
                        value={regData.password}
                        onChange={e => setRegData(p => ({ ...p, password: e.target.value }))}
                        placeholder="Mindst 6 tegn"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg pl-8 pr-8 py-1.5 text-[12px] text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500/50 transition-all"
                      />
                      <button type="button" onClick={() => setShowRegPw(p => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                        {showRegPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                    {/* Password strength */}
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

                  <p className="text-center text-[10px] text-slate-700 pb-1">
                    Har du en konto? Log ind i toppen.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
