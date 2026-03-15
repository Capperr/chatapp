"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Check, Loader2, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

const AVATAR_COLORS = [
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#3b82f6", // blue
  "#84cc16", // lime
  "#f97316", // orange
  "#14b8a6", // teal
];

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    bio: profile.bio ?? "",
    avatar_color: profile.avatar_color,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: formData.bio,
        avatar_color: formData.avatar_color,
      })
      .eq("id", profile.id);

    if (error) {
      setError("Kunne ikke gemme ændringer. Prøv igen.");
    } else {
      setSaved(true);
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar preview */}
      <div className="flex flex-col items-center gap-4">
        <Avatar
          name={profile.username}
          color={formData.avatar_color}
          size="xl"
          showOnline
        />
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center mb-2">
            @{profile.username}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            Brugernavn kan ikke ændres
          </p>
        </div>
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Palette className="w-4 h-4" />
          Avatarfarve
        </label>
        <div className="flex flex-wrap gap-2.5">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, avatar_color: color }));
                setSaved(false);
              }}
              className={cn(
                "w-9 h-9 rounded-full transition-all duration-200 hover:scale-110",
                formData.avatar_color === color
                  ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110"
                  : ""
              )}
              style={{
                backgroundColor: color,
                outlineColor: formData.avatar_color === color ? color : "transparent",
              }}
              aria-label={`Vælg farve ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <FileText className="w-4 h-4" />
          Bio
          <span className="ml-auto text-xs text-slate-400">
            {formData.bio.length}/200
          </span>
        </label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          className="input-base resize-none h-24 leading-relaxed"
          placeholder="Fortæl lidt om dig selv..."
          maxLength={200}
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          "btn-primary",
          saved && "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25"
        )}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Gemmer...
          </span>
        ) : saved ? (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            Gemt!
          </span>
        ) : (
          "Gem ændringer"
        )}
      </button>
    </form>
  );
}
