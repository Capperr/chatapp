import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountingClient } from "@/components/accounting/AccountingClient";
import type { Profile } from "@/types";

export default async function AccountingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="flex-1">
      <AccountingClient
        userId={user.id}
        displayName={(profile as Profile).display_name}
      />
    </div>
  );
}
