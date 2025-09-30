

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

export type Chat = {
  id: string;
  created_at: string;
  name: string | null;
  is_group: boolean;
  participants: string[];
  admin_id: string | null;
  otherParticipant?: UserProfile; // Used on the client for 1-on-1 chats
  participantProfiles?: UserProfile[]; // Used on the client for group chats
  last_message?: string | null;
  last_message_timestamp?: string | null;
};

export type Message = {
  id: string;
  created_at: string;
  content: string;
  sender_id: string;
  chat_id: string;
  type: 'text' | 'file';
  file_url: string | null;
  profiles?: UserProfile | null; // Associated sender profile
};

export type FriendRequest = {
  id: string;
  created_at: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  profiles: UserProfile | null; // The profile of the other user in the request
}

export interface HomeClientLayoutProps {
    currentUser: UserProfile;
    initialChats: Chat[];
    initialUsers: UserProfile[];
    initialFriendRequests: {
        incoming: FriendRequest[];
        outgoing: FriendRequest[];
    }
}

// Map Supabase user to our app's user profile concept for UI components
export const mapSupabaseUserToAppUser = (user: SupabaseUser): UserProfile => ({
    id: user.id,
    created_at: user.created_at,
    display_name: user.user_metadata.full_name || user.email || 'User',
    email: user.email || null,
    photo_url: user.user_metadata.avatar_url || null,
    status: 'online', // Placeholder
    bio: user.user_metadata.bio || null,
});
