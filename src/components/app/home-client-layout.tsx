

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
  
  const friends = useMemo(() => chats.filter(chat => !chat.is_group), [chats]);

  const refreshAllData = useCallback(async () => {
    try {
        const freshChats = await getChats();
        const currentChatCount = chats.length;
        
        setChats(freshChats);

        // If the selected chat was removed, clear it
        if (selectedChat && !freshChats.some(c => c.id === selectedChat.id)) {
            setSelectedChat(null);
             toast({
                title: "Friend Removed",
                description: `A user has removed you as a friend.`,
                variant: 'info'
            });
        }
    } catch (error) {
        // Handle error gracefully, maybe show a toast
        console.error("Failed to refresh chats", error);
    }
  }, [chats.length, selectedChat, toast]);

  useEffect(() => {
    setIsClient(true);
    if (friends.length > 0 && !selectedChat) {
      const sortedChats = [...friends].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSelectedChat(sortedChats[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling for chat list updates
  useEffect(() => {
      const interval = setInterval(() => {
        refreshAllData();
      }, 7000); // Poll every 7 seconds

      return () => clearInterval(interval);
  }, [refreshAllData]);


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
            allUsers={allUsers}
            selectedChat={selectedChat}
            setSelectedChat={setSelectedChat}
            listType="friend"
        />
    </div>
  );
}
