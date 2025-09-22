
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
  return data;
}

// Fetch all chats for the current user
export async function getChats(): Promise<Chat[]> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  const { data: chats, error } = await supabase
    .from('chats')
    .select('*')
    .or(`participants.cs.{${userId}}`); // Correctly query if userId is in participants array

  if (error) {
    console.error('Error fetching chats:', error);
    return [];
  }

  // For each chat, fetch the other participant's profile
  const chatsWithProfiles = await Promise.all(
    chats.map(async (chat) => {
      const otherParticipantId = chat.participants.find(p => p !== userId);
      if (otherParticipantId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherParticipantId)
          .single();
        if (profileError) {
          console.error('Error fetching participant profile:', profileError);
        } else {
          chat.otherParticipant = profile;
        }
      }
      return chat;
    })
  );

  return chatsWithProfiles;
}

// Create a new one-on-one chat
export async function createChat(otherUserId: string): Promise<Chat | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  // Check if a chat already exists between the two users
  const { data: existingChats, error: existingError } = await supabase
    .from('chats')
    .select('id, participants')
    .filter('is_group', 'eq', false)
    .or(`participants.cs.{${userId}}`) // Check chats where current user is a participant
    
  if (existingError) {
    console.error('Error checking for existing chats:', existingError);
    throw new Error('Could not check for existing chats.');
  }

  const existingChat = existingChats.find(c => c.participants.includes(otherUserId));

  if (existingChat) {
    console.log('Chat already exists.');
    // In a real app, you might want to return the existing chat or handle this case differently
    revalidatePath('/dashboard');
    return null;
  }

  const participants = [userId, otherUserId];
  const { data, error } = await supabase
    .from('chats')
    .insert([{ participants, is_group: false }])
    .select()
    .single();

  if (error) {
    console.error('Error creating chat:', error);
    throw new Error('Could not create chat.');
  }

  revalidatePath('/dashboard');
  return data;
}

// Fetch messages for a specific chat
export async function getMessages(chatId: string): Promise<Message[]> {
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
export async function sendMessage(chatId: string, content: string) {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('messages')
    .insert([{ chat_id: chatId, sender_id: userId, content: content, type: 'text' }]);

  if (error) {
    console.error('Error sending message:', error);
    throw new Error('Could not send message.');
  }
  
  // Revalidate the path to show the new message
  revalidatePath(`/dashboard`); 
  return data;
}
