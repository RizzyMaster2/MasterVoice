

'use client';

import type { UserProfile, Chat as AppChat, HomeClientLayoutProps } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { getChats } from '@/app/(auth)/actions/chat';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { createClient } from '@/lib/supabase/client';

export function HomeClientLayout({ currentUser, initialChats, allUsers }: HomeClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>(initialChats);
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const supabase = createClient();

  const friends = useMemo(() => chats.filter(chat => !chat.is_group), [chats]);

  const refreshAllData = useCallback(async () => {
    const freshChats = await getChats();
    setChats(freshChats);
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (friends.length > 0 && !selectedChat) {
      const sortedChats = [...friends].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSelectedChat(sortedChats[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    // Listen for new chats being added or removed for the current user
    const chatChannel = supabase
      .channel(`realtime-chat-participants-for-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
            const isExisting = payload.eventType === 'INSERT' && chats.some(c => c.id === payload.new.chat_id);
            
            if (payload.eventType === 'INSERT' && !isExisting) {
                toast({
                    title: "New Friend",
                    description: "Someone added you as a friend! Your chat list has been updated.",
                    variant: 'info'
                });
            } else if (payload.eventType === 'DELETE') {
                 const removedChat = chats.find(c => c.id === payload.old.chat_id);
                 if (removedChat) {
                     toast({
                        title: "Friend Removed",
                        description: `You are no longer friends with ${getErrorMessage(removedChat.otherParticipant?.display_name || 'a user')}.`,
                        variant: 'info'
                    });
                 }
            }

            refreshAllData();
            
            if (payload.eventType === 'DELETE' && selectedChat?.id === payload.old.chat_id) {
                setSelectedChat(null);
            }
        }
      )
      .subscribe();


    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [currentUser?.id, supabase, chats, refreshAllData, selectedChat?.id, toast]);


  if (!isClient) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <Skeleton className="flex-1 h-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full">
        <ChatLayout 
            currentUser={currentUser} 
            chats={friends}
            setChats={setChats}
            allUsers={allUsers}
            selectedChat={selectedChat}
            setSelectedChat={setSelectedChat}
            listType="friend"
        />
    </div>
  );
}

function getErrorMessage(error: unknown): string {
    let message: string;
    if (error instanceof Error) {
        message = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
        message = String((error as { message: unknown }).message);
    } else if (typeof error === 'string') {
        message = error;
    } else {
        message = 'An unknown error occurred.';
    }

    try {
        const parsed = JSON.parse(message);
        return parsed.message || parsed.error_description || message;
    } catch (e) {
        return message;
    }
}
