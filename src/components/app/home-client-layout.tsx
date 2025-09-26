
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
    console.log('HomeClientLayout: refreshAllData started');
    try {
        const [chatsData, usersData, requestsData] = await Promise.all([
          getChats(),
          getUsers(),
          getFriendRequests(),
        ]);
        console.log('HomeClientLayout: Fetched data', {
            chatsCount: chatsData.length,
            usersCount: usersData.length,
            requestsCount: requestsData.incoming.length + requestsData.outgoing.length
        });
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
    console.log('HomeClientLayout: Initial mount, starting data load.');
    setIsLoading(true);
    refreshAllData().finally(() => {
        console.log('HomeClientLayout: Initial data load finished.');
        setIsLoading(false)
    });
  }, [refreshAllData]);

  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chat');
    console.log(`HomeClientLayout: URL changed. Chat ID from URL: ${chatIdFromUrl}`);
    
    if (chatIdFromUrl && chats.length > 0) {
        const list = pathname.includes('/groups') ? groups : friends;
        const chatToSelect = list.find(c => c.id === chatIdFromUrl);
        if (chatToSelect) {
            console.log(`HomeClientLayout: Found chat to select from URL:`, chatToSelect);
            setSelectedChat(chatToSelect);
        } else {
            console.log(`HomeClientLayout: Chat ID ${chatIdFromUrl} not found in current list.`);
        }
    } else if (!chatIdFromUrl) {
      console.log('HomeClientLayout: No chat ID in URL, clearing selected chat.');
      setSelectedChat(null);
    }
  }, [searchParams, chats, friends, groups, pathname]);


  useEffect(() => {
    if (!user) return;
    console.log('HomeClientLayout: Setting up realtime subscriptions.');
    
    const channel = supabase
      .channel('home-layout-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        (payload) => {
            console.log('HomeClientLayout: Realtime change detected in `chats` table.', payload);
            refreshAllData();
            if (payload.eventType === 'DELETE' && selectedChat && payload.old.id === selectedChat.id) {
                console.log(`HomeClientLayout: Active chat ${selectedChat.id} was deleted. Clearing selection.`);
                setSelectedChat(null);
                router.replace(pathname);
            }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants' }, (payload) => {
          console.log('HomeClientLayout: Realtime change detected in `chat_participants` table.', payload);
          refreshAllData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, (payload) => {
          console.log('HomeClientLayout: Realtime change detected in `friend_requests` table.', payload);
          refreshAllData()
      })
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
              console.log('HomeClientLayout: Realtime channel subscribed successfully.');
          }
          if (status === 'CHANNEL_ERROR') {
              console.error('HomeClientLayout: Realtime channel error.', err);
          }
      });

    return () => {
      console.log('HomeClientLayout: Cleaning up realtime channel.');
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refreshAllData, selectedChat, router, pathname]);

  const handleChatDeleted = useCallback(() => {
    console.log('HomeClientLayout: handleChatDeleted called.');
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
  
  console.log('HomeClientLayout: Rendering with state:', { isLoading, selectedChatId: selectedChat?.id, chatsCount: chats.length });

  return (
    <HomeClientContext.Provider value={value}>
        {children}
    </HomeClientContext.Provider>
  );
}

    