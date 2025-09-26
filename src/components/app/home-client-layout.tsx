

'use client';

import type { UserProfile, Chat as AppChat, HomeClientLayoutProps } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { getChats } from '@/app/(auth)/actions/chat';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';

export function HomeClientLayout({ currentUser, initialChats, allUsers, initialFriendRequests }: HomeClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>(initialChats);
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { user } = useUser();
  const supabase = createClient();
  
  const friends = useMemo(() => chats.filter(chat => !chat.is_group), [chats]);

  const refreshChats = useCallback(async () => {
    try {
        const freshChats = await getChats();
        setChats(freshChats);
    } catch (error) {
        console.error("Failed to refresh chats", error);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (friends.length > 0 && !selectedChat) {
      const sortedChats = [...friends].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSelectedChat(sortedChats[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChats]); // Depend on initialChats to re-run if it changes

  useEffect(() => {
    if (!user) return;
    
    // Listen for inserts or deletes to the user's chats
    const channel = supabase
      .channel('home-client-layout-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
            refreshChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refreshChats]);


  if (!isClient) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <Skeleton className="flex-1 h-full" />
      </div>
    );
  }

  const handleChatDeleted = () => {
    refreshChats().then(() => {
        const newFriends = chats.filter(c => !c.is_group && c.id !== selectedChat?.id);
        if (newFriends.length > 0) {
            const sorted = [...newFriends].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setSelectedChat(sorted[0]);
        } else {
            setSelectedChat(null);
        }
    });
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
            onChatUpdate={refreshChats}
            onChatDeleted={handleChatDeleted}
        />
    </div>
  );
}
