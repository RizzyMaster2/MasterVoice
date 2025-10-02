
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

  // Step 1: Get the friend relationships for the current user.
  const { data: friendsRelations, error: friendsError } = await supabase
    .from('friends')
    .select('friend_id, created_at')
    .eq('user_id', user.id);
  
  if (friendsError) {
    console.error("Error fetching friends relationships:", friendsError);
    throw friendsError;
  }
  
  if (!friendsRelations || friendsRelations.length === 0) {
    return [];
  }

  // Step 2: Extract the friend IDs.
  const friendIds = friendsRelations.map(f => f.friend_id);

  // Step 3: Fetch the profiles for those friend IDs.
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', friendIds);

  if (profilesError) {
    console.error("Error fetching friend profiles:", profilesError);
    throw profilesError;
  }

  // Step 4: Combine the data into the `Friend` type.
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const friendsData: Friend[] = friendsRelations.map(relation => ({
    user_id: user.id,
    friend_id: relation.friend_id,
    created_at: relation.created_at,
    friend_profile: profileMap.get(relation.friend_id) as UserProfile, // Assume profile exists for simplicity
  })).filter(f => f.friend_profile); // Filter out any friends whose profiles weren't found
  
  return friendsData;
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
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
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
    
    // HOTFIX: Ensure sender has a public profile before sending a request.
    // This handles cases for users who signed up before the profile trigger was added.
    const { data: senderProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
    
    if (profileError || !senderProfile) {
        const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            display_name: user.user_metadata.display_name || user.email,
            full_name: user.user_metadata.full_name || user.email,
            email: user.email,
            photo_url: user.user_metadata.avatar_url || user.user_metadata.photo_url,
        });

        if (insertError) {
             throw new Error(`Could not create sender profile: ${insertError.message}`);
        }
    }


    // Check if they are already friends
    const { data: existingFriendship, error: friendCheckError } = await supabase
      .from('friends')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('friend_id', receiverId)
      .limit(1);

    if (friendCheckError) {
      throw new Error(`Database error: ${friendCheckError.message}`);
    }

    if (existingFriendship && existingFriendship.length > 0) {
      throw new Error("You are already friends with this user.");
    }

    // Check if a request already exists (either direction)
    const { data: existingRequest, error: requestCheckError } = await supabase
      .from('friend_requests')
      .select('id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
      .in('status', ['pending', 'accepted'])
      .limit(1);

    if (requestCheckError) {
      throw new Error(`Database error: ${requestCheckError.message}`);
    }

    if (existingRequest && existingRequest.length > 0) {
      throw new Error('A friend request already exists with this user.');
    }
    
    const { data, error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: user.id, receiver_id: receiverId, status: 'pending' })
        .select('*, sender_profile:profiles!friend_requests_sender_id_fkey(*)')
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

  const [incomingRes, outgoingRes] = await Promise.all([
    supabase
      .from('friend_requests')
      .select('*, sender_profile:profiles!friend_requests_sender_id_fkey(*)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending'),
    supabase
      .from('friend_requests')
      .select('*, receiver_profile:profiles!friend_requests_receiver_id_fkey(*)')
      .eq('sender_id', user.id)
      .eq('status', 'pending'),
  ]);

  if (incomingRes.error) {
    console.error('Error fetching incoming friend requests:', incomingRes.error);
    throw incomingRes.error;
  }
  if (outgoingRes.error) {
    console.error('Error fetching outgoing friend requests:', outgoingRes.error);
    throw outgoingRes.error;
  }

  // For outgoing requests, the profile we care about is the receiver's.
  // We aliased this to `receiver_profile` in the query.
  const outgoing = outgoingRes.data.map(req => ({
      ...req,
      // We are assigning the receiver's profile to the `sender_profile` field for UI consistency
      sender_profile: req.receiver_profile as UserProfile, 
  }));
  
  return {
    incoming: (incomingRes.data as FriendRequest[]) || [],
    outgoing: (outgoing as any[]) || [],
  };
}

export async function acceptFriendRequest(requestId: number, senderId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();

    // Call the RPC function
    const { error } = await supabase.rpc('accept_friend_request', {
        p_request_id: requestId,
        p_sender_id: senderId,
        p_receiver_id: user.id
    });

    if (error) {
        console.error('Error accepting friend request:', error);
        throw new Error(`Could not accept friend request: ${error.message}`);
    }

    revalidatePath('/home/friends');
}

export async function declineFriendRequest(requestId: number) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();
    
    // Instead of updating, we just delete the request.
    const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);


    if (error) throw new Error(error.message);
    
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

    