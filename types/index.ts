export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_color: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface MessageWithProfile extends Message {
  profiles: Profile;
}
