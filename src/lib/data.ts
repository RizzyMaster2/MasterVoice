

import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserProfile = {
  id: string;
  created_at: string;
  display_name: string | null;
  full_name: string | null;
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

export type FriendRequest = {
  id: number;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  sender_profile: UserProfile;
};


export type Message = {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_edited?: boolean;
  sender_profile?: UserProfile;
  is_typing?: boolean;
};

export type MessageEdit = {
    id: number;
    content: string;
}
