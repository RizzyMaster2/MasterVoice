
'use client';

import type { UserProfile, Chat as AppChat, FriendRequest } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { getChats, getFriendRequests, getUsers } from '@/app/(auth)/actions/chat';
import { useUser } from '@/hooks/use-user';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


function HomePageContent() {
  const [chats, setChats] = useState<AppChat[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isVerified, isLoading: isUserLoading } = useUser();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const friends = useMemo(() => chats.filter(chat => !chat.is_group), [chats]);

  const refreshAllData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const [chatsData, usersData] = await Promise.all([
          getChats(),
          getUsers(),
        ]);
        setChats(chatsData);
        setAllUsers(usersData.filter(u => u.id !== user.id)); // Exclude current user from 'all users'
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
  }, [user, toast]);

  useEffect(() => {
    if (isUserLoading) return; // Wait for user to be loaded
    
    const timeoutId = setTimeout(() => {
        if (isLoading) {
            toast({
                title: 'Failed to Load Data',
                description: 'Chat data could not be loaded. Please check your connection and refresh the page.',
                variant: 'destructive',
            });
            setIsLoading(false); 
        }
    }, 20000);

    refreshAllData();

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserLoading]);

  // Restore selected chat from URL after data has loaded
  useEffect(() => {
    if (!isLoading && friends.length > 0) {
      const chatIdFromUrl = searchParams.get('chat');
      if (chatIdFromUrl) {
          const chatToSelect = friends.find(c => c.id === chatIdFromUrl);
          if (chatToSelect && chatToSelect.id !== selectedChat?.id) {
              setSelectedChat(chatToSelect);
          }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, friends, searchParams]);


  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel(`home-page-user-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user.id}`},
        (payload) => refreshAllData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        (payload) => {
            refreshAllData();
            if (payload.eventType === 'DELETE' && selectedChat && payload.old.id === selectedChat.id) {
                setSelectedChat(null);
                router.replace('/home');
            }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        (payload) => refreshAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refreshAllData, selectedChat, router]);


  if (isLoading || isUserLoading || !user) {
    return (
        <div className="flex-1 flex flex-col gap-6 h-full">
            {user && !isVerified && <UnverifiedAccountWarning />}
            <Skeleton className="flex-1 h-full" />
        </div>
    );
  }
  
  const currentUserProfile: UserProfile = {
      id: user.id,
      display_name: user.user_metadata?.display_name || user.email || 'User',
      photo_url: user.user_metadata?.photo_url || '',
      created_at: user.created_at,
      email: user.email || null,
      status: 'online', 
  }

  const handleChatDeleted = () => {
    router.replace('/home'); 
    refreshAllData().then(() => {
        setSelectedChat(null);
    });
  }

  return (
    <div className="flex-1 flex flex-col gap-6 h-full">
        {!isVerified && <UnverifiedAccountWarning />}
        <ChatLayout 
            currentUser={currentUserProfile} 
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


export default function HomePage() {
  return (
    <Suspense fallback={<Skeleton className="h-full w-full" />}>
      <HomePageContent />
    </Suspense>
  );
}
