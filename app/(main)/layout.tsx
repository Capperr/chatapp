import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/ui/Navbar";
import type { Profile } from "@/types";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <Navbar profile={profile as Profile} />
      {/* Desktop: offset for sidebar. Mobile: offset for top/bottom bars */}
      <main className="md:ml-64 print:ml-0 min-h-screen pt-14 md:pt-0 pb-20 md:pb-0 print:pt-0 print:pb-0">
        {children}
      </main>
    </div>
  );
}
