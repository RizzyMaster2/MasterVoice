

import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserProfile = {
  id: string;
  created_at: string;
  display_name: string | null;
  email: string | null;
  photo_url: string | null;
  status: string | null;
  bio: string | null;
};

export type Friend = {
    user_id: string;
    friend_id: string;
    created_at: string;
    friend_profile: UserProfile;
}

export type Message = {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender_profile?: UserProfile;
};
