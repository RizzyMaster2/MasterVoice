
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
import { getFriends, getUsers } from '@/app/(auth)/actions/chat';
import type { UserProfile, Friend } from '@/lib/data';
import { LoadingScreen } from './loading-screen';

interface HomeClientContextType {
    currentUser: UserProfile;
    friends: Friend[];
    allUsers: UserProfile[];
    selectedFriend: UserProfile | null;
    setSelectedFriend: (friend: UserProfile | null) => void;
    refreshAllData: () => void;
    handleFriendRemoved: () => void;
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
  initialFriends: Friend[];
  initialUsers: UserProfile[];
  children: ReactNode;
}

export function HomeClientLayout({ 
    currentUser,
    initialFriends,
    initialUsers,
    children
}: HomeClientLayoutProps) {
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(initialUsers);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useUser();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const refreshAllData = useCallback(async () => {
    if (!user) return;
    try {
        const [friendsData, usersData] = await Promise.all([
          getFriends(),
          getUsers(),
        ]);
        setFriends(friendsData);
        setAllUsers(usersData.filter(u => u.id !== user.id));

    } catch (error) {
        console.error("HomeClientLayout: Failed to refresh data", error);
        toast({
            title: 'Error Fetching Data',
            description: 'Could not load your friends and contacts. Please try again later.',
            variant: 'destructive'
        });
    }
  }, [user, toast]);


  useEffect(() => {
    const friendIdFromUrl = searchParams.get('friend');
    
    if (friendIdFromUrl) {
        const friendToSelect = allUsers.find(u => u.id === friendIdFromUrl);
        if (friendToSelect) {
            setSelectedFriend(friendToSelect);
        }
    } else {
      setSelectedFriend(null);
    }
  }, [searchParams, allUsers]);


  useEffect(() => {
    if (!user) return;
    
    const realtimeChannel = supabase
      .channel('home-layout-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        (payload) => {
            refreshAllData();
            if (payload.eventType === 'DELETE' && selectedFriend && (payload.old.friend_id === selectedFriend.id || payload.old.user_id === selectedFriend.id)) {
                setSelectedFriend(null);
                router.replace(pathname);
            }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => {
           refreshAllData();
        }
      )
       .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        () => {
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
  }, [user, supabase, refreshAllData, selectedFriend, router, pathname]);

  const handleFriendRemoved = useCallback(() => {
    router.replace(pathname); 
    refreshAllData().then(() => {
        setSelectedFriend(null);
    });
  },[router, pathname, refreshAllData]);

  const value = {
      currentUser,
      friends,
      allUsers,
      selectedFriend,
      setSelectedFriend,
      refreshAllData,
      handleFriendRemoved,
      isLoading,
      // The groups functionality is removed for now
      groups: [],
      selectedChat: null,
      setSelectedChat: () => {},
      handleChatDeleted: () => {},
      friendRequests: {incoming: [], outgoing: []}
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
