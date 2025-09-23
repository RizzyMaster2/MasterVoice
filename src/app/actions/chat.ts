'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Chat, Message, UserProfile } from '@/lib/data';


// Get the current logged-in user's ID
async function getCurrentUserId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

// Fetch all user profiles from the database
export async function getUsers(): Promise<UserProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  // Add the AI bot to the list of users
  const botUser: UserProfile = {
    id: 'ai-bot-voicebot',
    display_name: 'VoiceBot',
    photo_url: `https://picsum.photos/seed/ai-bot/200/200`,
    created_at: new Date().toISOString(),
    email: 'bot@mastervoice.ai',
    status: 'online',
  };

  return [botUser, ...data.filter(u => u.id !== botUser.id)];
}

// Fetch all chats for the current user
export async function getChats(): Promise<Chat[]> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  
  // New single-query approach to fetch chats and participants
  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('*, chat_participants!inner(*, profiles(*))')
    .eq('chat_participants.user_id', userId);

  if (chatsError) {
    console.error('Error fetching user chat memberships:', chatsError);
    return [];
  }

  if (!chats) {
    return [];
  }

  // Process the chats to structure the data correctly for the client
  const processedChats = chats.map((chat) => {
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
      fullChat.participantProfiles = chat.chat_participants.map(p => p.profiles as UserProfile);
    } else {
      // For 1-on-1 chats, find the other participant's profile
      const otherParticipantProfile = chat.chat_participants.find(p => p.user_id !== userId)?.profiles;
      if (otherParticipantProfile) {
          fullChat.otherParticipant = otherParticipantProfile as UserProfile;
      }
    }
    return fullChat;
  }).filter(Boolean) as Chat[]; // Filter out any chats that might be malformed

  return processedChats;
}


// Create a new one-on-one chat
export async function createChat(otherUserId: string): Promise<Chat | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  // If creating a chat with the bot, we don't persist it.
  if (otherUserId === 'ai-bot-voicebot') {
      const botChat: Chat = {
        id: `chat-ai-bot-voicebot`,
        created_at: new Date().toISOString(),
        name: 'VoiceBot',
        is_group: false,
        participants: [userId, 'ai-bot-voicebot'],
        admin_id: null,
        otherParticipant: {
             id: 'ai-bot-voicebot',
            display_name: 'VoiceBot',
            photo_url: `https://picsum.photos/seed/ai-bot/200/200`,
            created_at: new Date().toISOString(),
            email: 'bot@mastervoice.ai',
            status: 'online',
        }
      };
      return botChat;
  }

  // Check if a chat already exists between the two users
    const { data: existingChats, error: existingError } = await supabase
        .rpc('get_existing_chat', { user1_id: userId, user2_id: otherUserId });

  if (existingError) {
    console.error('Error checking for existing chats:', existingError);
    throw new Error('Could not check for existing chats.');
  }

  if (existingChats && existingChats.length > 0) {
      console.log('Chat already exists.');
      // Find and return the existing chat details
      const { data: existingChatDetails, error: detailsError } = await supabase
        .from('chats')
        .select('*, chat_participants(user_id, profiles(*))')
        .in('id', existingChats)
        .single();
      if (detailsError) {
          console.error('Could not fetch details for existing chat', detailsError);
          return null;
      }
      revalidatePath('/dashboard');
      return {
          ...existingChatDetails,
          participants: existingChatDetails.chat_participants.map(p => p.user_id)
      };
  }

  // If no chat exists, create a new one
  const { data, error } = await supabase
    .from('chats')
    .insert([{ is_group: false }])
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating chat:', error);
    throw new Error('Could not create chat.');
  }

  const newChatId = data.id;
  const participantsToInsert = [
      { chat_id: newChatId, user_id: userId },
      { chat_id: newChatId, user_id: otherUserId }
  ];

  const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(participantsToInsert);
  
  if (participantsError) {
      console.error('Error adding participants:', participantsError);
      // Clean up created chat if participant insertion fails
      await supabase.from('chats').delete().eq('id', newChatId);
      throw new Error('Could not add participants to chat.');
  }
  
  revalidatePath('/dashboard');
  return { ...data, participants: [userId, otherUserId] };
}

export async function createGroupChat(name: string, participantIds: string[]): Promise<Chat | null> {
    const supabase = createClient();
    const userId = await getCurrentUserId();

    const allParticipantIds = Array.from(new Set([userId, ...participantIds]));

    const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert([{
            name,
            is_group: true,
            admin_id: userId,
        }])
        .select()
        .single();

    if (chatError || !chatData) {
        console.error('Error creating group chat:', chatError);
        throw new Error('Could not create group chat.');
    }

    const participantsToInsert = allParticipantIds.map(pId => ({
        chat_id: chatData.id,
        user_id: pId,
    }));

    const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participantsToInsert);
    
    if (participantsError) {
        console.error('Error adding participants to group chat:', participantsError);
        // Attempt to clean up the created chat row if participants fail to insert
        await supabase.from('chats').delete().eq('id', chatData.id);
        throw new Error('Could not add members to the group chat.');
    }
    
    revalidatePath('/dashboard');
    return { ...chatData, participants: allParticipantIds };
}

// Fetch messages for a specific chat
export async function getMessages(chatId: string): Promise<Message[]> {
   // If it's a chat with the bot, return a welcome message.
  if (chatId === 'chat-ai-bot-voicebot') {
    return [{
      id: 'ai-welcome-message',
      created_at: new Date().toISOString(),
      content: "Hello! I'm VoiceBot, your friendly AI assistant. Ask me anything!",
      sender_id: 'ai-bot-voicebot',
      chat_id: chatId,
      type: 'text',
      file_url: null,
      profiles: {
            id: 'ai-bot-voicebot',
            display_name: 'VoiceBot',
            photo_url: `https://picsum.photos/seed/ai-bot/200/200`,
            created_at: new Date().toISOString(),
            email: 'bot@mastervoice.ai',
            status: 'online',
        }
    }];
  }

  const supabase = createClient();
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
}

// Send a new message
export async function sendMessage(chatId: string, content: string, type: 'text' | 'file' = 'text') {
  const supabase = createClient();
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
    console.error('Error sending message:', error);
    throw new Error('Could not send message.');
  }
  
  // The client will get the new message via real-time subscription.
  return data;
}
