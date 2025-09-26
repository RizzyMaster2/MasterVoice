
'use client';

import type { UserProfile, Chat as AppChat, FriendRequest } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { getChats, getFriendRequests, getUsers } from '@/app/(auth)/actions/chat';
import { Skeleton } from '../ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';

interface HomeClientLayoutProps {
  currentUser: UserProfile;
}

function HomeClientLayoutContent({ currentUser }: HomeClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({ incoming: [], outgoing: []});
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

        // After data is loaded, check URL for a chat to select
        const chatIdFromUrl = searchParams.get('chat');
        if (chatIdFromUrl) {
            const chatToSelect = chatsData.find(c => c.id === chatIdFromUrl && !c.is_group);
            if (chatToSelect) {
                setSelectedChat(chatToSelect);
            }
        }
    } catch (error) {
        console.error("Failed to refresh data", error);
    } finally {
        setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    setIsLoading(true);
    refreshAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        () => {
            refreshAllData();
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
  }, [user, supabase, refreshAllData]);


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
  return (
    <Suspense fallback={<Skeleton className="flex-1 h-full" />}>
      <HomeClientLayoutContent {...props} />
    </Suspense>
  )
}
