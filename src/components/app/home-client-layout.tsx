
'use client';

import type { UserProfile, Chat as AppChat, HomeClientLayoutProps } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { useState, useMemo, useEffect } from 'react';
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

  useEffect(() => {
    setIsClient(true);
    if (friends.length > 0 && !selectedChat) {
      const sortedChats = [...friends].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSelectedChat(sortedChats[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    const refreshAllData = async () => {
        const chats = await getChats();
        setChats(chats);
    };

     const chatChannel = supabase
      .channel(`realtime-chats-for-${currentUser.id}`)
      .on( 'postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${currentUser.id}`, },
        (payload) => {
            const newChatId = payload.new.chat_id;
            const isExisting = chats.some(c => c.id === newChatId);
            if (!isExisting) {
                toast({
                    title: "New Friend",
                    description: "Someone added you as a friend! Your chat list has been updated.",
                    variant: 'info'
                });
                refreshAllData();
            }
        }
      )
      .on( 'postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${currentUser.id}`, },
        (payload) => {
            const deletedChatId = payload.old.chat_id;
            const removedChat = chats.find(c => c.id === deletedChatId);
            setChats(prev => prev.filter(c => c.id !== deletedChatId));
            if (selectedChat?.id === deletedChatId) setSelectedChat(null);
            
            if (removedChat) {
                toast({
                    title: "Friend Removed",
                    description: `You are no longer friends with ${getErrorMessage(removedChat.otherParticipant?.display_name || 'a user')}.`,
                    variant: 'info'
                });
            }
        }
      )
      .subscribe();


    return () => {
      supabase.removeChannel(chatChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, supabase, allUsers, chats]);


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
