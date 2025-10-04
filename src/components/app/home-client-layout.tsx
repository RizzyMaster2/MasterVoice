
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
import { getFriends, getUsers, getFriendRequests } from '@/app/(auth)/actions/chat';
import type { UserProfile, Friend, FriendRequest } from '@/lib/data';
import { LoadingScreen } from './loading-screen';

interface HomeClientContextType {
    currentUser: UserProfile;
    friends: Friend[];
    friendRequests: { incoming: FriendRequest[], outgoing: FriendRequest[] };
    allUsers: UserProfile[];
    selectedFriend: UserProfile | null;
    setSelectedFriend: (friend: UserProfile | null) => void;
    refreshAllData: (isInitialLoad?: boolean) => void;
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
  initialFriendRequests: { incoming: FriendRequest[], outgoing: FriendRequest[] };
  initialUsers: UserProfile[];
  children: ReactNode;
}

export function HomeClientLayout({ 
    currentUser,
    initialFriends,
    initialFriendRequests,
    initialUsers,
    children
}: HomeClientLayoutProps) {
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [friendRequests, setFriendRequests] = useState(initialFriendRequests);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(initialUsers);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useUser();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const refreshAllData = useCallback(async (isInitialLoad = false) => {
    if (!user) return;
    if (isInitialLoad && initialFriends.length === 0 && initialUsers.length === 0) {
        setIsLoading(true);
    }
    try {
        const [friendsData, usersData, friendRequestsData] = await Promise.all([
          getFriends(),
          getUsers(),
          getFriendRequests(),
        ]);
        setFriends(friendsData);
        setAllUsers(usersData.filter(u => u.id !== user.id));
        setFriendRequests(friendRequestsData);

    } catch (error) {
        console.error("HomeClientLayout: Failed to refresh data", error);
        toast({
            title: 'Error Fetching Data',
            description: 'Could not load your friends and contacts. Please try again later.',
            variant: 'destructive'
        });
    } finally {
        if (isLoading) {
            setIsLoading(false);
        }
    }
  }, [user, toast, initialFriends, initialUsers, isLoading]);

  useEffect(() => {
    // We only want to run this once on initial load, but not on subsequent re-renders
    if (isLoading) {
        refreshAllData(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


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
            // Check if the change is relevant to the current user
            if (payload.new.user_id === user.id || payload.old.user_id === user.id) {
                toast({
                    title: 'Friends list updated!',
                    description: 'Your connections have changed.',
                    variant: 'info'
                });
                refreshAllData();
            }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        (payload) => {
             // Check if the change is relevant to the current user
            if (payload.new.receiver_id === user.id || payload.new.sender_id === user.id || payload.old.receiver_id === user.id || payload.old.sender_id === user.id) {
                refreshAllData();
                if (payload.eventType === 'INSERT' && payload.new.receiver_id === user.id) {
                    const sender = allUsers.find(u => u.id === payload.new.sender_id);
                    toast({
                        title: 'New Friend Request!',
                        description: `You have a new friend request from ${sender?.display_name || 'a user'}.`,
                        variant: 'info'
                    });
                }
            }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
           const newMessage = payload.new;
           // Only show toast if the message is not from the current user and for the selected chat
            if (newMessage.sender_id !== user.id && selectedFriend?.id === newMessage.sender_id) {
                // Already in chat, no toast needed, realtime message will appear
            } else if (newMessage.sender_id !== user.id) {
                const sender = allUsers.find(u => u.id === newMessage.sender_id);
                toast({
                    title: `New Message from ${sender?.display_name || 'a friend'}`,
                    description: newMessage.content,
                })
            }
        }
      )
       .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
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
  }, [user, supabase, refreshAllData, selectedFriend, toast, allUsers]);

  const handleFriendRemoved = useCallback(() => {
    router.replace(pathname, {scroll: false}); 
    refreshAllData().then(() => {
        setSelectedFriend(null);
    });
  },[router, pathname, refreshAllData]);

  const value = {
      currentUser,
      friends,
      friendRequests,
      allUsers,
      selectedFriend,
      setSelectedFriend,
      refreshAllData,
      handleFriendRemoved,
      isLoading,
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
