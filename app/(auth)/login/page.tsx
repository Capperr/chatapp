import { LoginForm } from "@/components/auth/LoginForm";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Zap } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle compact />
      </div>

      {/* Card */}
      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center shadow-2xl shadow-primary-500/40">
              <Zap className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            Velkommen tilbage
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Log ind for at fortsætte chatten
          </p>
        </div>

        <div className="card p-6 glow">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
