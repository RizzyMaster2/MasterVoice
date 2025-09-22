
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserProfile = {
  id: string;
  created_at: string;
  display_name: string | null;
  email: string | null;
  photo_url: string | null;
  status: string | null;
};

export type Chat = {
  id: string;
  created_at: string;
  name: string | null;
  is_group: boolean;
  participants: string[];
  admin_id: string | null;
  otherParticipant?: UserProfile; // Used on the client to show who you're chatting with
};

export type Message = {
  id: string;
  created_at: string;
  content: string;
  sender_id: string;
  chat_id: string;
  type: string;
  profiles?: UserProfile | null; // Associated sender profile
};

// Map Supabase user to our app's user profile concept for UI components
export const mapSupabaseUserToAppUser = (user: SupabaseUser): UserProfile => ({
    id: user.id,
    created_at: user.created_at,
    display_name: user.user_metadata.full_name || user.email || 'User',
    email: user.email || null,
    photo_url: user.user_metadata.avatar_url || null,
    status: 'online', // Placeholder
});
