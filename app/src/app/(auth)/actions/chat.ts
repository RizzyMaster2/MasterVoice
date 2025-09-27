
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Chat, Message, UserProfile, FriendRequest } from '@/lib/data';
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
      // Log the error but don't fail; we can still construct users from auth data
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

// Fetch all chats for the current user
export async function getChats(): Promise<Chat[]> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return [];
    }
    
    const allUsers = await getUsers();
    const userMap = new Map(allUsers.map(u => [u.id, u]));
    userMap.set(authUser.id, {
      id: authUser.id,
      display_name: authUser.user_metadata?.display_name || authUser.email,
      photo_url: authUser.user_metadata?.photo_url || '',
      created_at: authUser.created_at,
      email: authUser.email || null,
      status: 'online',
      bio: authUser.user_metadata?.bio || null,
    });


    // 1. Get all chat_ids the user is a part of
    const { data: userChatLinks, error: chatLinksError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', authUser.id);
    
    if (chatLinksError) {
      console.error("Error fetching user's chat links:", chatLinksError);
      return [];
    }

    const chatIds = userChatLinks.map(link => link.chat_id);
    if (chatIds.length === 0) {
        return [];
    }

    // 2. Fetch all data for those chats and all their participants
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('*, chat_participants(user_id)')
      .in('id', chatIds);

    if (chatsError) {
        console.error('Error fetching chats:', chatsError);
        return [];
    }

    // 3. Process the chats to add participant profiles
    const processedChats = chatsData.map((chat) => {
      const participantIds = chat.chat_participants.map(p => p.user_id);
      
      const fullChat: Chat = {
          id: chat.id,
          created_at: chat.created_at,
          name: chat.name,
          is_group: chat.is_group,
          admin_id: chat.admin_id,
          participants: participantIds,
      };

      if (chat.is_group) {
        fullChat.participantProfiles = participantIds
            .map((id: string) => userMap.get(id))
            .filter((p: any): p is UserProfile => !!p);
      } else {
        const otherParticipantId = participantIds.find((id: string) => id !== authUser.id);
        if (otherParticipantId) {
          fullChat.otherParticipant = userMap.get(otherParticipantId);
        }
      }
      return fullChat;
    }).filter(chat => {
        // Critical fix: Ensure we only return 1-on-1 chats where we could find the other participant.
        if (!chat.is_group) {
            return !!chat.otherParticipant;
        }
        return true;
    });

    return processedChats;
  } catch (error) {
    console.error('getChats failed:', error);
    return [];
  }
}

export async function getInitialHomeData(userId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.rpc('get_initial_home_data', { p_user_id: userId });

    if (error) {
        return { data: null, error: error.message };
    }

    const { all_users, chats, incoming_requests, outgoing_requests } = data;

    const userMap = new Map(all_users.map((u: UserProfile) => [u.id, u]));

    const processedChats = chats.map((chat: any) => {
        const participantIds = chat.participants;
        if (chat.is_group) {
            chat.participantProfiles = participantIds
                .map((id: string) => userMap.get(id))
                .filter((p: any): p is UserProfile => !!p);
        } else {
            const otherParticipantId = participantIds.find((id: string) => id !== userId);
            if (otherParticipantId) {
                chat.otherParticipant = userMap.get(otherParticipantId);
            }
        }
        return chat;
    }).filter((chat: Chat) => {
        if (!chat.is_group) return !!chat.otherParticipant;
        return true;
    });

    const processedIncoming = incoming_requests.map((req: any) => ({
        ...req,
        profiles: userMap.get(req.from_user_id)
    })) as FriendRequest[];
    
    const processedOutgoing = outgoing_requests.map((req: any) => ({
        ...req,
        profiles: userMap.get(req.to_user_id)
    })) as FriendRequest[];
    
    const finalData = {
        all_users,
        chats: processedChats,
        incoming_requests: processedIncoming,
        outgoing_requests: processedOutgoing
    }

    return {
        data: finalData,
        error: null,
    };
}


// This function is now only used INTERNALLY by the accept_friend_request RPC
// It is no longer exposed as a primary user action.
export async function createChat(otherUserId: string): Promise<{ chat: Chat | null, isNew: boolean }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const { data: existingChat, error: existingError } = await supabase
        .rpc('get_existing_chat', { user1_id: userId, user2_id: otherUserId });

    if (existingError) {
      throw new Error(existingError.message);
    }

    const allUsers = await getUsers();
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    if (existingChat && existingChat.length > 0) {
      const { data: chatDetails, error: detailsError } = await supabase
        .from('chats')
        .select('*, chat_participants!inner(*)')
        .eq('id', existingChat[0].chat_id)
        .single();
      
      if (detailsError) throw detailsError;

       const participantIds = chatDetails.chat_participants.map((p: { user_id: any; }) => p.user_id);
       const otherParticipantId = participantIds.find((id: string) => id !== userId);

      const chatToReturn: Chat = {
        ...chatDetails,
        participants: participantIds,
        otherParticipant: otherParticipantId ? userMap.get(otherParticipantId) : undefined,
      }

      return { chat: chatToReturn, isNew: false };
    }

    const { data: newChatId, error: rpcError } = await supabase
      .rpc('create_chat_and_add_participants', { other_user_id: otherUserId });

    if (rpcError) {
      throw new Error(rpcError.message);
    }

     if (!newChatId) {
      throw new Error('Chat creation returned no ID.');
    }

    // After creating, fetch the full chat to return
     const { data: finalNewChat, error: newChatError } = await supabase
        .from('chats')
        .select('*, chat_participants!inner(*)')
        .eq('id', newChatId)
        .single();
    
    if (newChatError || !finalNewChat) {
      throw new Error('Failed to fetch newly created chat.');
    }

    const otherParticipantId = finalNewChat.chat_participants.find((p: { user_id: string; }) => p.user_id !== userId)?.user_id;

    const chatToReturn: Chat = {
        id: finalNewChat.id,
        created_at: finalNewChat.created_at,
        is_group: finalNewChat.is_group,
        name: finalNewChat.name,
        admin_id: finalNewChat.admin_id,
        participants: finalNewChat.chat_participants.map((p: { user_id: any; }) => p.user_id),
        otherParticipant: otherParticipantId ? userMap.get(otherParticipantId) : undefined,
    };
    
    revalidatePath('/home/friends');
    return { chat: chatToReturn, isNew: true };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred while creating the chat.';
    throw new Error(message);
  }
}

export async function createGroupChat(name: string, participantIds: string[]): Promise<Chat | null> {
    try {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);
        const user = await getCurrentUser();
        const userId = user.id;

        const allParticipantIds = Array.from(new Set([userId, ...participantIds]));

        const { data: newGroup, error: rpcError } = await supabase
            .rpc('create_group_chat_and_add_participants', {
                group_name: name,
                participant_ids: allParticipantIds,
            })
            .select()
            .single();

        if (rpcError) {
            throw new Error(rpcError.message);
        }
        
        revalidatePath('/home/groups');
        return { ...newGroup, participants: allParticipantIds };

    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
}

// Fetch messages for a specific chat
export async function getMessages(chatId: string): Promise<Message[]> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
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
export async function sendMessage(chatId: string, content: string, type: 'text' | 'file' = 'text') {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    // Verify the user is part of the chat before allowing them to send a message
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      throw new Error('You are not a member of this chat.');
    }
    
    const messageData: {
      chat_id: string;
      sender_id: string;
      content: string;
      type: string;
      file_url?: string;
    } = {
      chat_id: chatId,
      sender_id: userId,
      content: type === 'file' ? 'Attachment' : content,
      type: type,
    };

    if (type === 'file') {
      messageData.file_url = content;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
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

export async function deleteMessage(messageId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    // First, verify the user is the sender of the message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();
    
    if (fetchError || !message) {
      throw new Error('Message not found.');
    }
    
    if (message.sender_id !== userId) {
      throw new Error('You can only delete your own messages.');
    }
    
    // If they are the sender, delete the message
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
      
    if (deleteError) {
      throw new Error(deleteError.message);
    }
    
  } catch(error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(message);
  }
}

export async function deleteChat(chatId: string, otherParticipantId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const user = await getCurrentUser();
    const userId = user.id;
    const supabaseAdmin = createAdminClient();

    // Verify the user is actually part of this chat before deleting
    const { data: participants, error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId);

    if (participantError) throw new Error('Could not verify chat participants.');

    const participantIds = participants.map(p => p.user_id);
    if (!participantIds.includes(userId) || !participantIds.includes(otherParticipantId)) {
      throw new Error('You do not have permission to delete this chat.');
    }

    // Delete the chat. The `on delete cascade` on the `chat_id` foreign keys
    // in `messages` and `chat_participants` tables will handle the cleanup.
    const { error: deleteError } = await supabaseAdmin
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidatePath('/home/friends');

  } catch(error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(message);
  }
}

// --- Friend Request Actions ---

export async function getFriendRequests(): Promise<{ incoming: FriendRequest[], outgoing: FriendRequest[] }> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const user = await getCurrentUser();
    const userId = user.id;
    const allUsers = await getUsers();
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // Fetch incoming requests
    const { data: incoming, error: incomingError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('to_user_id', userId)
      .eq('status', 'pending');

    if (incomingError) throw incomingError;

    // Fetch outgoing requests
    const { data: outgoing, error: outgoingError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('from_user_id', userId)
      .eq('status', 'pending');
      
    if (outgoingError) throw outgoingError;
    
    const processedIncoming = incoming.map(req => ({
        ...req,
        profiles: userMap.get(req.from_user_id)
    })) as FriendRequest[];
    
    const processedOutgoing = outgoing.map(req => ({
        ...req,
        profiles: userMap.get(req.to_user_id)
    })) as FriendRequest[];

    return { incoming: processedIncoming, outgoing: processedOutgoing };
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    return { incoming: [], outgoing: [] };
  }
}

export async function sendFriendRequest(toUserId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const fromUser = await getCurrentUser();
  const fromUserId = fromUser.id;
  
  if (!fromUser.email_confirmed_at) {
    throw new Error("You must verify your email before sending friend requests.");
  }

  if (fromUserId === toUserId) {
    throw new Error("You cannot send a friend request to yourself.");
  }

  // Use RPC to check for existing request
  const { data: existingRequest, error: existingError } = await supabase
    .rpc('check_existing_friend_request', {
      user1_id: fromUserId,
      user2_id: toUserId
    });
  
  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingRequest) {
    if(existingRequest.status === 'pending') throw new Error("A friend request is already pending.");
    if(existingRequest.status === 'accepted') throw new Error("You are already friends with this user.");
  }
  
  // Check if they are already friends by looking for an existing chat
  const { data: existingChat, error: chatError } = await supabase
    .rpc('get_existing_chat', { user1_id: fromUserId, user2_id: toUserId });
  
  if (chatError) {
    throw new Error(chatError.message);
  }

  if (existingChat && existingChat.length > 0) {
    throw new Error("You are already friends with this user.");
  }
  
  const { data: insertedRequest, error } = await supabase
    .from('friend_requests')
    .insert({ from_user_id: fromUserId, to_user_id: toUserId })
    .select()
    .single();
  
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/home/friends');
}

export async function acceptFriendRequest(requestId: string): Promise<Chat | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: newChatId, error: rpcError } = await supabase.rpc('accept_friend_request', { request_id: requestId });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  if (!newChatId) {
    revalidatePath('/home/friends');
    return null;
  }
  
  // Fetch the newly created chat to return it to the client for immediate update
  const { data: newChat, error: chatError } = await supabase
    .from('chats')
    .select('*, chat_participants(*)')
    .eq('id', newChatId)
    .single();

  if (chatError || !newChat) {
    revalidatePath('/home/friends');
    return null;
  }

  const allUsers = await getUsers();
  const userMap = new Map(allUsers.map(u => [u.id, u]));
  const user = await getCurrentUser();
  const userId = user.id;
  const otherParticipantId = newChat.chat_participants.find((p: { user_id: string; }) => p.user_id !== userId)?.user_id;

  revalidatePath('/home/friends');

  return {
    ...newChat,
    participants: newChat.chat_participants.map((p: { user_id: any; }) => p.user_id),
    otherParticipant: otherParticipantId ? userMap.get(otherParticipantId) : undefined,
  };
}

export async function declineFriendRequest(requestId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
    
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/home/friends');
}

export async function cancelFriendRequest(requestId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId);
    
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/home/friends');
}

export async function getFriendsForUser(userId: string): Promise<UserProfile[]> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    // This function will execute a raw SQL query to get friends.
    // 1. Find all 1-on-1 chats the user is in.
    // 2. For each chat, find the OTHER participant.
    // 3. Get the profile of that other participant.
    const { data: friends, error } = await supabase.rpc('get_user_friends', { p_user_id: userId });

    if (error) {
        console.error(`Error fetching friends for user ${userId} via RPC:`, error);
        throw new Error(error.message);
    }

    // The RPC returns user objects which should match the UserProfile structure.
    // We need to fetch the full profiles from the `users` (auth) and `profiles` tables
    // to build the complete UserProfile object.
    
    const allUsers = await getUsers();
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    const friendIds = friends.map((f: { friend_id: string }) => f.friend_id);
    
    const friendProfiles = friendIds
        .map(id => userMap.get(id))
        .filter((p): p is UserProfile => !!p);
      
    return friendProfiles;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`Error in getFriendsForUser for user ${userId}:`, message);
    throw new Error(message);
  }
}
