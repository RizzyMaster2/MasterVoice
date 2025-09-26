

'use client';

import type { UserProfile, Chat as AppChat } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { getChats, getUsers } from '@/app/(auth)/actions/chat';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';

function GroupsPageContent() {
  const [chats, setChats] = useState<AppChat[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isVerified } = useUser();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const groups = useMemo(() => chats.filter(chat => chat.is_group), [chats]);

  const refreshData = useCallback(async () => {
    // Keep this loading true to show skeleton on first load.
    // Subsequent refreshes will be in the background.
    if (!isClient) setIsLoading(true);
    
    const [chatsData, usersData] = await Promise.all([getChats(), getUsers()]);
    setChats(chatsData);
    setAllUsers(usersData);
    
    // If the currently selected group was deleted, reset selection
    if (selectedChat && !chatsData.some(c => c.id === selectedChat.id)) {
        setSelectedChat(null);
    } else if (selectedChat) {
        // Reselect the chat to get fresh participant data
        const freshSelectedChat = chatsData.find(c => c.id === selectedChat.id);
        setSelectedChat(freshSelectedChat || null);
    }
    
    setIsLoading(false);
  }, [selectedChat, isClient]);


  useEffect(() => {
    setIsClient(true);
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore selected chat from URL on initial load
   useEffect(() => {
    if (isClient && chats.length > 0 && !selectedChat) {
      const chatIdFromUrl = searchParams.get('chat');
      if (chatIdFromUrl) {
        const chat = groups.find(c => c.id === chatIdFromUrl);
        if (chat) {
          setSelectedChat(chat);
        }
      }
    }
  }, [isClient, chats, groups, selectedChat, searchParams]);


   useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('groups-page-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => refreshData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_participants' },
        () => refreshData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refreshData]);


  if (!isClient || isLoading || !user) {
    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
            {!isVerified && <UnverifiedAccountWarning />}
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
      status: 'online', // Placeholder
  }

  const handleChatDeleted = () => {
    router.replace('/home/groups'); // Clear query params
    refreshData().then(() => {
        setSelectedChat(null);
    });
  }

  return (
    <>
      <div className="flex-1 flex flex-col gap-6 h-full">
        {!isVerified && <UnverifiedAccountWarning />}
        <ChatLayout 
            currentUser={currentUserProfile} 
            chats={groups} 
            allUsers={allUsers}
            selectedChat={selectedChat}
            setSelectedChat={setSelectedChat}
            listType="group"
            onChatUpdate={refreshData}
            onChatDeleted={handleChatDeleted}
        />
      </div>
    </>
  );
}


export default function GroupsPage() {
  return (
    <Suspense fallback={<Skeleton className="flex-1 h-full" />}>
      <GroupsPageContent />
    </Suspense>
  );
}
