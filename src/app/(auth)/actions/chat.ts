
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
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users from auth:', error);
      return [];
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
        photo_url: profile?.photo_url || user.user_metadata?.photo_url || null,
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
    
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*, chat_participants!inner(*, profiles(*))')
      .eq('chat_participants.user_id', authUser.id);

    if (chatsError) {
      console.error('Error fetching user chat memberships:', chatsError);
      return [];
    }

    if (!chats) {
      return [];
    }

    const allUsers = await getUsers();
    const userMap = new Map(allUsers.map(u => [u.id, u]));

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
        fullChat.participantProfiles = chat.chat_participants.map((p: { profiles: UserProfile; }) => p.profiles as UserProfile);
      } else {
        const otherParticipantId = participantIds.find((id: string) => id !== authUser.id);
        if (otherParticipantId) {
          fullChat.otherParticipant = userMap.get(otherParticipantId);
        }
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

    if (existingChat && existingChat.length > 0) {
      const { data: chatDetails, error: detailsError } = await supabase
        .from('chats')
        .select('*, chat_participants!inner(*, profiles(*))')
        .eq('id', existingChat[0])
        .single();
      
      if (detailsError) throw detailsError;

       const participantIds = chatDetails.chat_participants.map((p: { user_id: any; }) => p.user_id);
       const otherParticipantProfile = chatDetails.chat_participants.find((p: { user_id: string; }) => p.user_id !== userId)?.profiles;

      const chatToReturn: Chat = {
        ...chatDetails,
        participants: participantIds,
        otherParticipant: otherParticipantProfile,
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

    // After creating, construct the chat object to return without another fetch
    const users = await getUsers();
    const otherUser = users.find(u => u.id === otherUserId);
    
    if (!otherUser) {
        throw new Error('Failed to find profile for the other user.');
    }
    
    const finalNewChat: Chat = {
        id: newChatId,
        created_at: new Date().toISOString(),
        is_group: false,
        name: null,
        admin_id: userId,
        participants: [userId, otherUserId],
        otherParticipant: otherUser,
    };
    
    revalidatePath('/home');
    return { chat: finalNewChat, isNew: true };
    
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
