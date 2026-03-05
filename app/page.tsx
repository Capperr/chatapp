"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { VirtualRoom } from "@/components/chat/VirtualRoom";
import { ChatGateway } from "@/components/chat/ChatGateway";
import type { Profile } from "@/types";

interface RoomMeta { id: string; name: string; cols: number; rows: number; is_default: boolean; }

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [defaultRoom, setDefaultRoom] = useState<RoomMeta | null>(null);

  const loadUserData = useCallback(async (): Promise<boolean> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const [{ data: p }, { data: rooms }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("chat_rooms").select("id, name, cols, rows, is_default").order("created_at"),
    ]);
    if (p) setProfile(p as Profile);
    if (rooms && rooms.length > 0) {
      const def = (rooms as RoomMeta[]).find(r => r.is_default) ?? rooms[0];
      setDefaultRoom(def as RoomMeta);
    }
    return true;
  }, []);

  // Auto-open chat if already logged in
  useEffect(() => {
    loadUserData().then(loggedIn => { if (loggedIn) setChatOpen(true); });
  }, []); // eslint-disable-line

  const handleAuthSuccess = useCallback(async () => {
    await loadUserData();
    // profile + defaultRoom now set → VirtualRoom will render
  }, [loadUserData]);

  return (
    <>
      {/* ── Landing page (always rendered as background) ── */}
      <div className="min-h-screen bg-[#030912] flex flex-col overflow-hidden relative">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
          <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px]" />
          <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full bg-cyan-600/5 blur-[80px]" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Top nav */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
            </div>
            <span className="text-white font-bold text-[15px] tracking-tight">ChatApp</span>
          </div>
          <button
            onClick={() => setChatOpen(true)}
            className="text-[13px] text-slate-400 hover:text-white transition-colors font-medium"
          >
            Log ind
          </button>
        </nav>

        {/* Hero */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[12px] font-semibold mb-8 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Live nu • Gratis • Ingen download
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-5 max-w-2xl">
            Mød folk,{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              chat
            </span>{" "}
            og hav det sjovt
          </h1>

          <p className="text-slate-400 text-lg max-w-lg mb-10 leading-relaxed">
            En virtuel verden med isometriske rum, avatarer og realtime chat.
            Tilpas din karakter og udforsk fællesskabet.
          </p>

          <button
            onClick={() => setChatOpen(true)}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-[16px] shadow-[0_8px_32px_rgba(124,58,237,0.45)] hover:shadow-[0_12px_48px_rgba(124,58,237,0.65)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
          >
            <span>Åben chatten og kom igang nu</span>
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/80 group-hover:translate-x-0.5 transition-transform">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
            </svg>
          </button>

          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {[
              { icon: "🎭", label: "Tilpassede avatarer" },
              { icon: "🪙", label: "Møntvaluta & butik" },
              { icon: "🏠", label: "Virtuelle rum" },
              { icon: "⚡", label: "Realtime chat" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-slate-400 text-[12px] font-medium"
              >
                <span>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Isometric preview at bottom */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl overflow-hidden h-48 z-0">
          <svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMax meet" className="w-full h-full opacity-20">
            {[0,1,2,3,4,5,6].map(i => (
              <g key={i} transform={`translate(${80 + i * 90}, ${130 - Math.abs(i - 3) * 12})`}>
                <polygon points="0,-20 45,2.5 0,25 -45,2.5" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
                <polygon points="0,25 -45,2.5 -45,15 0,37.5" fill="#0f172a" />
                <polygon points="0,25 45,2.5 45,15 0,37.5" fill="#162032" />
              </g>
            ))}
            {[1, 3, 5].map((i, k) => {
              const colors = ["#8b5cf6", "#06b6d4", "#f59e0b"];
              const cx = 80 + i * 90; const cy = 130 - Math.abs(i - 3) * 12 - 30;
              return (
                <g key={k} transform={`translate(${cx}, ${cy})`}>
                  <ellipse cx="0" cy="5" rx="10" ry="3" fill="rgba(0,0,0,0.3)" />
                  <circle cx="0" cy="-10" r="8" fill={colors[k]} />
                  <rect x="-7" y="-2" width="14" height="12" rx="3" fill={colors[k]} />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#030912] to-transparent" />
        </div>
      </div>

      {/* ── Auth popup (not logged in) ── */}
      {chatOpen && !profile && (
        <ChatGateway
          onAuthSuccess={handleAuthSuccess}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* ── Chat popup (logged in) ── */}
      {chatOpen && profile && defaultRoom && (
        <VirtualRoom
          roomId={defaultRoom.id}
          roomName={defaultRoom.name}
          currentProfile={profile}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}
