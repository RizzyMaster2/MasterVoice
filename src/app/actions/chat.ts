
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

  return [botUser, ...data];
}

// Fetch all chats for the current user
export async function getChats(): Promise<Chat[]> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  
  // 1. Get all chat_ids the user is a part of.
  const { data: chatParticipants, error: participantsError } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', userId);

  if (participantsError) {
    console.error('Error fetching user chat memberships:', participantsError);
    return [];
  }
  
  if (!chatParticipants || chatParticipants.length === 0) {
      return [];
  }

  const chatIds = chatParticipants.map(p => p.chat_id);

  // 2. Get all chat details for those chat_ids
  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('*, chat_participants(user_id)')
    .in('id', chatIds);

  if (chatsError) {
    console.error('Error fetching chats:', chatsError);
    return [];
  }

  // 3. Process chats to add participant profiles
   const processedChats = await Promise.all(
    chats.map(async (chat) => {
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
        // For groups, fetch all participant profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', participantIds);
        if (profileError) {
            console.error(`Error fetching profiles for group ${chat.id}:`, profileError);
        } else {
            fullChat.participantProfiles = profiles as UserProfile[];
        }
      } else {
        // For 1-on-1 chats, find the other participant's profile
        const otherParticipantId = participantIds.find(p => p !== userId);
        if (otherParticipantId) {
            if (otherParticipantId === 'ai-bot-voicebot') {
                 fullChat.otherParticipant = {
                    id: 'ai-bot-voicebot',
                    display_name: 'VoiceBot',
                    photo_url: 'https://picsum.photos/seed/ai-bot/200/200',
                    created_at: new Date().toISOString(),
                    email: 'bot@mastervoice.ai',
                    status: 'online',
                };
            } else {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', otherParticipantId)
                    .single();

                if (profileError) {
                    console.error(`Error fetching profile for user ${otherParticipantId}:`, profileError);
                } else {
                    fullChat.otherParticipant = profile as UserProfile;
                }
            }
        }
      }
      return fullChat;
    })
  );

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
      return null;
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



  