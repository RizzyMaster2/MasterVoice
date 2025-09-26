
'use client';

import type { UserProfile, Chat as AppChat, FriendRequest } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { getChats, getFriendRequests, getUsers } from '@/app/(auth)/actions/chat';
import { Skeleton } from '../ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface HomeClientLayoutProps {
  currentUser: UserProfile;
}

function HomeClientLayoutContent({ currentUser }: HomeClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({ incoming: [], outgoing: []});
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const { user } = useUser();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const friends = useMemo(() => chats.filter(chat => !chat.is_group), [chats]);

  const refreshAllData = useCallback(async () => {
    try {
        const [chatsData, usersData, requestsData] = await Promise.all([
          getChats(),
          getUsers(),
          getFriendRequests()
        ]);
        setChats(chatsData);
        setAllUsers(usersData);
        setFriendRequests(requestsData);

    } catch (error) {
        console.error("Failed to refresh data", error);
        toast({
            title: 'Error Fetching Data',
            description: 'Could not load your chats and contacts. Please try again later.',
            variant: 'destructive'
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setIsLoading(true);
    const timeoutId = setTimeout(() => {
        if (isLoading) {
            toast({
                title: 'Failed to Load Data',
                description: 'Chat data could not be loaded. Please check your connection and refresh the page.',
                variant: 'destructive',
            });
            setIsLoading(false); // Stop showing loading skeleton
        }
    }, 20000); // 20 seconds timeout

    refreshAllData();

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // This effect runs after the initial data load to restore selection from URL.
    if (!isLoading && chats.length > 0) {
      const chatIdFromUrl = searchParams.get('chat');
      if (chatIdFromUrl) {
          const chatToSelect = chats.find(c => c.id === chatIdFromUrl && !c.is_group);
          if (chatToSelect && chatToSelect.id !== selectedChat?.id) {
              setSelectedChat(chatToSelect);
          }
      }
    }
  }, [isLoading, chats, searchParams, selectedChat?.id]);


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
            refreshAllData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        (payload) => {
            refreshAllData();
            // If the selected chat was deleted, deselect it
            if (payload.eventType === 'DELETE' && selectedChat && payload.old.id === selectedChat.id) {
                setSelectedChat(null);
            }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => refreshAllData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `from_user_id=eq.${user.id}`,
        },
        () => refreshAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refreshAllData, selectedChat]);


  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <Skeleton className="flex-1 h-full" />
      </div>
    );
  }

  const handleChatDeleted = () => {
    router.replace('/home'); // Clear query params
    refreshAllData().then(() => {
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
            onChatUpdate={refreshAllData}
            onChatDeleted={handleChatDeleted}
        />
    </div>
  );
}


export function HomeClientLayout(props: HomeClientLayoutProps) {
  return <HomeClientLayoutContent {...props} />;
}
