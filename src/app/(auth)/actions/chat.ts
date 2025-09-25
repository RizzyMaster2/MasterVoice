
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Chat, Message, UserProfile } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';


// Get the current logged-in user's ID
async function getCurrentUserId() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

// Fetch all user profiles from the database
export async function getUsers(): Promise<UserProfile[]> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data: { users }, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('Error fetching users from auth:', authUsersError);
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
    if (!authUser) return [];
    
    // 1. Get all chat_ids the user is a part of.
    const { data: userChatLinks, error: chatIdsError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', authUser.id);
    
    if (chatIdsError) {
      console.error('Error fetching user chat links:', chatIdsError);
      return [];
    }

    const chatIds = userChatLinks.map(link => link.chat_id);
    if (chatIds.length === 0) {
        return [];
    }

    // 2. Fetch all data for those chats, including all their participants
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*, chat_participants(user_id)')
      .in('id', chatIds)
      .order('created_at', { ascending: false });

    if (chatsError) {
      console.error('Error fetching chats details:', chatsError);
      return [];
    }

    // 3. Get all users to map participant IDs to profiles
    const allUsers = await getUsers();
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // 4. Process the chats to add participant profiles
    const processedChats = chats.map((chat) => {
      const participantIds = chat.chat_participants.map((p: { user_id: any; }) => p.user_id);
      
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
            .filter((p): p is UserProfile => !!p);
      } else {
        const otherParticipantId = participantIds.find((id: string) => id !== authUser.id);
        if (otherParticipantId) {
          fullChat.otherParticipant = userMap.get(otherParticipantId);
        }
      }

      // Ensure we only return chats where we could find the other participant for 1-on-1s
      if (!chat.is_group && !fullChat.otherParticipant) {
          return null;
      }
      return fullChat;
    }).filter(Boolean) as Chat[];

    return processedChats;
  } catch (error) {
    console.error('getChats failed:', error);
    return [];
  }
}


// Create a new one-on-one chat
export async function createChat(otherUserId: string): Promise<{ chat: Chat | null, isNew: boolean }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const userId = await getCurrentUserId();

    const { data: existingChat, error: existingError } = await supabase
        .rpc('get_existing_chat', { user1_id: userId, user2_id: otherUserId });

    if (existingError) {
      console.error('Error checking for existing chats:', existingError);
      throw new Error(`Could not check for existing chats: ${existingError.message}`);
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
      console.error('Error creating chat via RPC:', rpcError);
      throw new Error(`Could not create chat: ${rpcError.message}`);
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
    
    revalidatePath('/home');
    return { chat: chatToReturn, isNew: true };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred while creating the chat.';
    console.error('createChat failed:', error);
    throw new Error(message);
  }
}

export async function createGroupChat(name: string, participantIds: string[]): Promise<Chat | null> {
    try {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);
        const userId = await getCurrentUserId();

        const allParticipantIds = Array.from(new Set([userId, ...participantIds]));

        const { data: newGroup, error: rpcError } = await supabase
            .rpc('create_group_chat_and_add_participants', {
                group_name: name,
                participant_ids: allParticipantIds,
            })
            .select()
            .single();

        if (rpcError || !newGroup) {
            console.error('Error creating group chat via RPC:', rpcError);
            throw new Error('Could not create group chat. This may be due to database security policies.');
        }
        
        revalidatePath('/home');
        revalidatePath('/home/groups');
        return { ...newGroup, participants: allParticipantIds };

    } catch (error) {
        console.error('createGroupChat failed:', error);
        throw new Error(error instanceof Error ? error.message : 'You must be logged in to create a group chat.');
    }
}

// Fetch messages for a specific chat
export async function getMessages(chatId: string): Promise<Message[]> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles(*)')
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
    const userId = await getCurrentUserId();
    
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
      // The most likely error is an RLS violation.
      console.error('Supabase sendMessage error:', error.message);
      throw new Error(`Could not send message: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred while sending the message.';
    console.error(`sendMessage failed:`, message);
    throw new Error(message);
  }
}

export async function deleteChat(chatId: string, otherParticipantId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const userId = await getCurrentUserId();
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
      console.error('Supabase delete chat error:', deleteError);
      throw new Error(`Could not delete chat: ${deleteError.message}`);
    }

    revalidatePath('/home');

  } catch(error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`deleteChat failed:`, message);
    throw new Error(message);
  }
}

    