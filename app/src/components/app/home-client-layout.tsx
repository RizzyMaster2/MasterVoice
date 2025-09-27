
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
import { getInitialHomeData } from '@/app/(auth)/actions/chat';
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
  const [isLoading, setIsLoading] = useState(false); // No longer loading by default

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
    setIsLoading(true);
    try {
        const { data, error } = await getInitialHomeData(user.id);
        if (error) throw new Error(error);

        setChats(data.chats);
        setAllUsers(data.all_users.filter((u: UserProfile) => u.id !== user.id));
        setFriendRequests({
            incoming: data.incoming_requests,
            outgoing: data.outgoing_requests,
        });

    } catch (error) {
        console.error("HomeClientLayout: Failed to refresh data", error);
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
        { event: '*', schema: 'public' },
        (payload) => {
            // A simple but effective way to ensure data consistency
            refreshAllData();
            if (payload.eventType === 'DELETE' && selectedChat && (payload.old as any).id === selectedChat.id) {
                setSelectedChat(null);
                router.replace(pathname, {scroll: false});
            }
        }
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
              // Quietly subscribed
          }
          if (status === 'CHANNEL_ERROR') {
              console.error('HomeClientLayout: Realtime channel error.', err);
              toast({title: 'Connection Lost', description: 'Could not connect to real-time updates.', variant: 'destructive'});
          }
      });

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [user, supabase, refreshAllData, selectedChat, router, pathname, toast]);

  const handleChatDeleted = useCallback(() => {
    router.replace(pathname, {scroll: false}); 
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

  return (
    <HomeClientContext.Provider value={value}>
        {isLoading ? <LoadingScreen /> : children}
    </HomeClientContext.Provider>
  );
}
