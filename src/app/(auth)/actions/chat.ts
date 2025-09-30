
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Message, UserProfile, Friend } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';


// Get the current logged-in user and their auth data
async function getCurrentUser() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}


// Fetch all user profiles from the database
export async function getUsers(): Promise<UserProfile[]> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data: { users }, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authUsersError) {
      throw new Error('Could not fetch users from authentication system.');
    }

    const userIds = users.map(u => u.id);
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles for users:', profilesError);
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const combinedUsers: UserProfile[] = users.map(user => {
      const profile = profileMap.get(user.id);
      return {
        id: user.id,
        created_at: profile?.created_at || user.created_at,
        display_name: profile?.display_name || user.user_metadata?.display_name || user.email || 'User',
        email: user.email || profile?.email || null,
        photo_url: profile?.photo_url || user.user_metadata?.photo_url || user.user_metadata?.avatar_url || null,
        status: profile?.status || 'offline',
        bio: profile?.bio || user.user_metadata?.bio || null,
      };
    });
    return combinedUsers;

  } catch (error) {
    console.error('Error in getUsers:', error);
    return [];
  }
}

// Fetch all friends for the current user
export async function getFriends(): Promise<Friend[]> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('friends')
      .select('*, friend_profile:profiles!friends_friend_id_fkey(*)')
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Error fetching friends:", error);
      return [];
    }

    return data as Friend[];

  } catch (error) {
    console.error('getFriends failed:', error);
    return [];
  }
}


// Fetch messages between the current user and a friend
export async function getMessages(friendId: string): Promise<Message[]> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender_profile:profiles!messages_sender_id_fkey(*)')
      .or(`(sender_id.eq.${user.id},receiver_id.eq.${friendId}),(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    return data as Message[];
  } catch(error) {
      console.error('getMessages failed:', error);
      return [];
  }
}

// Send a new message
export async function sendMessage(receiverId: string, content: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const user = await getCurrentUser();
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: content
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred while sending the message.';
    throw new Error(message);
  }
}

export async function addFriend(friendId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();

    if (user.id === friendId) {
        throw new Error("You cannot add yourself as a friend.");
    }
    
    // The RLS policy will prevent adding a friend that already exists,
    // but we can check here to provide a better error message.
    const { data: existing, error: existingError } = await supabase
        .from('friends')
        .select()
        .eq('user_id', user.id)
        .eq('friend_id', friendId)
        .single();
    
    if(existing) {
        throw new Error("You are already friends with this user.");
    }

    // Add friend for current user
    const { error: error1 } = await supabase
        .from('friends')
        .insert({ user_id: user.id, friend_id: friendId });

    if (error1) {
      // If the first insert fails, we don't proceed.
      // The RLS policy might be the cause, e.g., if the friendship already exists.
      throw new Error(error1.message);
    }

    // Add the reverse friendship
    const { error: error2 } = await supabase
        .from('friends')
        .insert({ user_id: friendId, friend_id: user.id });

    if (error2) {
      // If the second insert fails, we should ideally roll back the first.
      // For simplicity here, we'll just log the error. In a production app,
      // you would use a transaction or an RPC function to ensure atomicity.
      console.error("Failed to create reverse friendship:", error2);
       throw new Error(`Friend added, but reverse relationship failed: ${error2.message}`);
    }

    revalidatePath('/home');
    revalidatePath('/home/friends');
}


export async function deleteMessage(messageId: number) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const user = await getCurrentUser();
    
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id); // RLS also enforces this, but it's good practice
      
    if (deleteError) {
      throw new Error(deleteError.message);
    }
    
  } catch(error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(message);
  }
}

export async function removeFriend(friendId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();
    const userId = user.id;

    // Use an RPC function for atomicity or just delete both relationships.
    const { error: error1 } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId);

    const { error: error2 } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', userId);

    if (error1 || error2) {
        const message = error1?.message || error2?.message || "An unknown error occurred.";
        console.error("Error removing friend: ", message);
        throw new Error(message);
    }
    
    revalidatePath('/home');
    revalidatePath('/home/friends');
}

export async function getInitialHomeData() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { friends: [], allUsers: [] };
    }

    const [friendsData, allUsersData] = await Promise.all([
        getFriends(),
        getUsers()
    ]);

    return {
        friends: friendsData,
        allUsers: allUsersData.filter(u => u.id !== user.id),
    };
}
