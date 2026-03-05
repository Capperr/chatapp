import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";
import type { AppNotification } from "@/types";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select("*, sender:sender_id(id, display_name, avatar_color, username), room:room_id(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Mark all as read on page open
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return <NotificationsClient initialNotifications={(data as AppNotification[]) ?? []} />;
}
