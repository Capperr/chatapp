"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, User, LogOut, Zap } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

interface NavbarProps {
  profile: Profile;
}

const navItems = [
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/profile", icon: User, label: "Profil" },
];

export function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 glass-strong border-r border-black/[0.06] dark:border-white/[0.06] z-40">
        {/* Logo */}
        <div className="p-6 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">ChatApp</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn("nav-link", pathname === href && "active")}
            >
              <Icon className="w-5 h-5" />
              {label}
              {pathname === href && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
          <ThemeToggle className="w-full" />

          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]">
            <Avatar
              name={profile.display_name}
              color={profile.avatar_color}
              size="sm"
              showOnline
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {profile.display_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                @{profile.username}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="nav-link w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <LogOut className="w-5 h-5" />
            Log ud
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center justify-around px-4 py-2 safe-area-bottom">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-200",
                pathname === href
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              <Icon
                className={cn(
                  "w-6 h-6 transition-transform duration-200",
                  pathname === href && "scale-110"
                )}
              />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
          <ThemeToggle compact />
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 glass-strong border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold gradient-text">ChatApp</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar
              name={profile.display_name}
              color={profile.avatar_color}
              size="sm"
              showOnline
            />
            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
