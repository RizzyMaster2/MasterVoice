
'use client';

import { 
    useState, 
    useEffect, 
    useCallback, 
    useMemo, 
    createContext, 
    useContext,
    type ReactNode 
} from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { getChats, getFriendRequests, getUsers } from '@/app/(auth)/actions/chat';
import type { UserProfile, Chat, FriendRequest } from '@/lib/data';
import { LoadingScreen } from './loading-screen';

interface HomeClientContextType {
    currentUser: UserProfile;
    chats: Chat[];
    friends: Chat[];
    groups: Chat[];
    allUsers: UserProfile[];
    friendRequests: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
    selectedChat: Chat | null;
    setSelectedChat: (chat: Chat | null) => void;
    refreshAllData: () => void;
    handleChatDeleted: () => void;
    isLoading: boolean;
}

const HomeClientContext = createContext<HomeClientContextType | null>(null);

export function useHomeClient() {
    const context = useContext(HomeClientContext);
    if (!context) {
        throw new Error('useHomeClient must be used within a HomeClientLayout');
    }
    return context;
}

interface HomeClientLayoutProps {
  currentUser: UserProfile;
  initialChats: Chat[];
  initialFriendRequests: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
  initialUsers: UserProfile[];
  children: ReactNode;
}

export function HomeClientLayout({ 
    currentUser, 
    initialChats, 
    initialFriendRequests,
    initialUsers,
    children
}: HomeClientLayoutProps) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(initialUsers);
  const [friendRequests, setFriendRequests] = useState(initialFriendRequests);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useUser();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const friends = useMemo(() => chats.filter(chat => !chat.is_group), [chats]);
  const groups = useMemo(() => chats.filter(chat => chat.is_group), [chats]);

  const refreshAllData = useCallback(async () => {
    if (!user) return;
    // Don't set loading state here to avoid flashing the loading screen on every refresh
    try {
        const [chatsData, usersData, requestsData] = await Promise.all([
          getChats(),
          getUsers(),
          getFriendRequests(),
        ]);
        setChats(chatsData);
        setAllUsers(usersData.filter(u => u.id !== user.id));
        setFriendRequests(requestsData);

    } catch (error) {
        console.error("HomeClientLayout: Failed to refresh data", error);
        toast({
            title: 'Error Fetching Data',
            description: 'Could not load your chats and contacts. Please try again later.',
            variant: 'destructive'
        });
    }
  }, [user, toast]);

  useEffect(() => {
    setIsLoading(true);
    refreshAllData().finally(() => {
        setIsLoading(false)
    });
  }, [refreshAllData]);

  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chat');
    
    if (chatIdFromUrl && chats.length > 0) {
        const list = pathname.includes('/groups') ? groups : friends;
        const chatToSelect = list.find(c => c.id === chatIdFromUrl);
        if (chatToSelect) {
            setSelectedChat(chatToSelect);
        }
    } else if (!chatIdFromUrl) {
      setSelectedChat(null);
    }
  }, [searchParams, chats, friends, groups, pathname]);


  useEffect(() => {
    if (!user) return;
    
    const realtimeChannel = supabase
      .channel('home-layout-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        (payload) => {
            refreshAllData();
            if (payload.eventType === 'DELETE' && selectedChat && payload.old.id === selectedChat.id) {
                setSelectedChat(null);
                router.replace(pathname);
            }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants' }, () => {
          refreshAllData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
          refreshAllData()
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat?.id}` },
        () => {
           // A new message arrived for the currently selected chat, refresh all data to get it.
           // This is a simple approach. A more optimized one would be to fetch just the new message.
           refreshAllData();
        }
      )
       .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat?.id}` },
        () => {
           // A message was deleted in the current chat, refresh.
           refreshAllData();
        }
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
              // Quietly subscribed
          }
          if (status === 'CHANNEL_ERROR') {
              console.error('HomeClientLayout: Realtime channel error.', err);
          }
      });

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [user, supabase, refreshAllData, selectedChat, router, pathname]);

  const handleChatDeleted = useCallback(() => {
    router.replace(pathname); 
    refreshAllData().then(() => {
        setSelectedChat(null);
    });
  },[router, pathname, refreshAllData]);

  const value = {
      currentUser,
      chats,
      friends,
      groups,
      allUsers,
      friendRequests,
      selectedChat,
      setSelectedChat,
      refreshAllData,
      handleChatDeleted,
      isLoading
  };
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <HomeClientContext.Provider value={value}>
        {children}
    </HomeClientContext.Provider>
  );
}

    