
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Message, UserProfile, Friend, FriendRequest } from '@/lib/data';
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
      const displayName = profile?.display_name || user.user_metadata?.display_name || profile?.full_name || user.email;
      return {
        id: user.id,
        created_at: profile?.created_at || user.created_at,
        display_name: displayName,
        full_name: profile?.full_name || user.user_metadata?.full_name || displayName,
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
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const user = await getCurrentUser();

  const { data: friendsData, error } = await supabase
    .from('friends')
    .select(`
      user_id,
      friend_id,
      created_at,
      friend_profile:profiles!friends_friend_id_fkey(*)
    `)
    .eq('user_id', user.id);

  if (error) {
    console.error("Error fetching friends:", error);
    throw error;
  }
  
  return friendsData as Friend[];
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

export async function sendFriendRequest(receiverId: string): Promise<FriendRequest> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();

    if (user.id === receiverId) {
        throw new Error("You cannot send a friend request to yourself.");
    }
    
    const { data, error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: user.id, receiver_id: receiverId })
        .select(`*, sender_profile:profiles!friend_requests_sender_id_fkey(*)`)
        .single();

    if (error) {
        if (error.code === '23505') { // unique_violation
            throw new Error('A friend request already exists with this user.');
        }
        throw new Error(error.message);
    }
    revalidatePath('/home/friends');
    return data as FriendRequest;
}


export async function getFriendRequests(): Promise<{
    incoming: FriendRequest[];
    outgoing: FriendRequest[];
}> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();

    const { data: requests, error } = await supabase
        .from('friend_requests')
        .select(`
            *,
            sender_profile:profiles!friend_requests_sender_id_fkey(*),
            receiver_profile:profiles!friend_requests_receiver_id_fkey(*)
        `)
        .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)
        .eq('status', 'pending');

    if (error) {
        console.error('Error fetching friend requests:', error);
        throw error;
    }

    const incoming = requests
        .filter(req => req.receiver_id === user.id)
        .map(req => ({...req, sender_profile: req.sender_profile as UserProfile }));

    const outgoing = requests
        .filter(req => req.sender_id === user.id)
        .map(req => ({...req, sender_profile: req.receiver_profile as UserProfile }));

    return { incoming, outgoing };
}

export async function acceptFriendRequest(requestId: number, senderId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();
    const receiverId = user.id;

    // Use an RPC function to handle this atomically in a real-world scenario
    const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('receiver_id', receiverId);
    
    if (updateError) throw updateError;
    
    // Create friendships
    const { error: friendsError } = await supabase.from('friends').insert([
        { user_id: senderId, friend_id: receiverId },
        { user_id: receiverId, friend_id: senderId },
    ]);

    if (friendsError) throw friendsError;

    revalidatePath('/home/friends');
}

export async function declineFriendRequest(requestId: number) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();
    
    const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId)
        .eq('receiver_id', user.id);

    if (error) throw error;
    
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
        return { friends: [], allUsers: [], friendRequests: { incoming: [], outgoing: [] } };
    }

    const [friendsData, allUsersData, friendRequestsData] = await Promise.all([
        getFriends(),
        getUsers(),
        getFriendRequests(),
    ]);

    return {
        friends: friendsData,
        allUsers: allUsersData.filter(u => u.id !== user.id),
        friendRequests: friendRequestsData
    };
}
