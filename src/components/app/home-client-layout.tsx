
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
  initialChats: AppChat[];
  allUsers: UserProfile[];
}

export function HomeClientLayout({ currentUser, initialChats, allUsers: initialAllUsers }: HomeClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>(initialChats);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(initialAllUsers);
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  
  const { user } = useUser();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const friends = useMemo(() => chats.filter(chat => !chat.is_group), [chats]);

  const refreshAllData = useCallback(async () => {
    try {
        const [chatsData, usersData] = await Promise.all([
          getChats(),
          getUsers(),
        ]);
        setChats(chatsData);
        setAllUsers(usersData);

    } catch (error) {
        console.error("Failed to refresh data", error);
        toast({
            title: 'Error Fetching Data',
            description: 'Could not load your chats and contacts. Please try again later.',
            variant: 'destructive'
        });
    }
  }, [toast]);


  useEffect(() => {
    if (friends.length > 0) {
      const chatIdFromUrl = searchParams.get('chat');
      if (chatIdFromUrl) {
          const chatToSelect = friends.find(c => c.id === chatIdFromUrl);
          if (chatToSelect && chatToSelect.id !== selectedChat?.id) {
              setSelectedChat(chatToSelect);
          }
      }
    }
  }, [friends, searchParams, selectedChat?.id]);


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
        },
        () => refreshAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refreshAllData, selectedChat]);

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
