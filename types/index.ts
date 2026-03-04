export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_color: string;
  role: "user" | "admin";
  muted_until: string | null;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  edited_at: string | null;
  is_deleted: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface MessageWithProfile extends Message {
  profiles: Profile;
}

export interface AccountingShift {
  id: string;
  user_id: string;
  shift_date: string;
  vagt_nummer: string;
  konto: number;
  kreditkort: number;
  diverse: number;
  drikkepenge: number;
  kontant: number;
  total_indkoert: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxSettings {
  user_id: string;
  loenstype: "loenmodtager" | "provisions";
  skatteprocent: number;
  provision_sats: number;
  updated_at: string;
}
