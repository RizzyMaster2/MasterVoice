

'use client';

import type { UserProfile, Chat as AppChat, HomeClientLayoutProps } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { getChats } from '@/app/(auth)/actions/chat';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';

function HomeClientLayoutContent({ currentUser, initialChats, allUsers, initialFriendRequests }: HomeClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>(initialChats);
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { user } = useUser();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  
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
  }, []);

  // Restore selected chat from URL on initial load
  useEffect(() => {
    if (isClient && chats.length > 0 && !selectedChat) {
      const chatIdFromUrl = searchParams.get('chat');
      if (chatIdFromUrl) {
        const chat = friends.find(c => c.id === chatIdFromUrl);
        if (chat) {
          setSelectedChat(chat);
        }
      }
    }
  }, [isClient, chats, friends, selectedChat, searchParams]);


  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel(`home-layout-user-${user.id}`)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        () => {
            // This is a bit broad, but ensures groups updates are caught too
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
    router.replace('/home'); // Clear query params
    refreshChats().then(() => {
        setSelectedChat(null);
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


export function HomeClientLayout(props: HomeClientLayoutProps) {
  return (
    <Suspense fallback={<Skeleton className="flex-1 h-full" />}>
      <HomeClientLayoutContent {...props} />
    </Suspense>
  )
}
