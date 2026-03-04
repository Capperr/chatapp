"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const [step, setStep] = useState<"form" | "success">("form");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // Check username availability
    const { data: existing } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", formData.username.toLowerCase())
      .maybeSingle();

    if (existing) {
      setError("Brugernavnet er allerede taget. Vælg et andet.");
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          username: formData.username.toLowerCase(),
          display_name: formData.displayName || formData.username,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (signUpError) {
      const msg =
        signUpError.message.includes("already registered")
          ? "E-mailen er allerede registreret."
          : signUpError.message.includes("Password")
          ? "Adgangskoden skal være mindst 6 tegn."
          : "Der opstod en fejl. Prøv igen.";
      setError(msg);
      setLoading(false);
      return;
    }

    // Try to sign in directly (if email confirmation is disabled)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (!signInError) {
      router.push("/chat");
      router.refresh();
      return;
    }

    setStep("success");
    setLoading(false);
  };

  if (step === "success") {
    return (
      <div className="text-center space-y-4 animate-fade-in">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Tjek din e-mail!
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Vi har sendt en bekræftelsesmail til{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {formData.email}
            </span>
          </p>
        </div>
        <Link href="/login" className="btn-secondary block text-center">
          Tilbage til log ind
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Brugernavn
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input-base pl-8"
              placeholder="bruger123"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
              title="Kun bogstaver, tal og underscore"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Visningsnavn
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              className="input-base pl-10"
              placeholder="Jens Jensen"
              maxLength={50}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          E-mail
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input-base pl-10"
            placeholder="din@email.dk"
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Adgangskode
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="input-base pl-10 pr-12"
            placeholder="Mindst 6 tegn"
            required
            minLength={6}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex gap-1 mt-1.5">
          {[6, 8, 12].map((len) => (
            <div
              key={len}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                formData.password.length >= len
                  ? "bg-primary-500"
                  : "bg-slate-200 dark:bg-slate-700"
              )}
            />
          ))}
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary mt-2">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Opretter konto...
          </span>
        ) : (
          "Opret konto"
        )}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Har du allerede en konto?{" "}
        <Link
          href="/login"
          className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
        >
          Log ind her
        </Link>
      </p>
    </form>
  );
}
