
'use client';

import { 
    useState, 
    useEffect, 
    useCallback, 
    createContext, 
    useContext,
    type ReactNode 
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { getFriends, getUsers, getFriendRequests } from '@/app/(auth)/actions/chat';
import type { UserProfile, Friend, FriendRequest } from '@/lib/data';
import { LoadingScreen } from './loading-screen';
import { CallProvider } from './call-provider';

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
    unreadMessages: Set<string>;
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

const CACHE_KEY = 'homeClientData';
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

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
  const [selectedFriend, setSelectedFriendState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(new Set<string>());

  const { user, isLoading: isUserLoading } = useUser();
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const setSelectedFriend = useCallback((friend: UserProfile | null) => {
    setSelectedFriendState(friend);
    if (friend) {
        setUnreadMessages(prev => {
            const newUnread = new Set(prev);
            newUnread.delete(friend.id);
            return newUnread;
        });
    }
  }, []);

  const refreshAllData = useCallback(async (isInitialLoad = false) => {
    if (!user) return;
    if (isInitialLoad) {
        setIsLoading(true);
    }
    try {
        const [friendsData, usersData, friendRequestsData] = await Promise.all([
          getFriends(),
          getUsers(),
          getFriendRequests(),
        ]);
        const filteredUsers = usersData.filter(u => u.id !== user.id);
        setFriends(friendsData);
        setAllUsers(filteredUsers);
        setFriendRequests(friendRequestsData);

        const cacheData = {
            friends: friendsData,
            allUsers: filteredUsers,
            friendRequests: friendRequestsData,
            timestamp: Date.now(),
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    } catch (error) {
        console.error("HomeClientLayout: Failed to refresh data", error);
        toast({
            title: 'Error Fetching Data',
            description: 'Could not load your friends and contacts. Please try again later.',
            variant: 'destructive'
        });
    } finally {
        if (isInitialLoad) {
            setIsLoading(false);
        }
    }
  }, [user, toast]);

  useEffect(() => {
    const loadData = async () => {
        if (isUserLoading) return;
        if (!user) {
            setIsLoading(false);
            return;
        }

        try {
            const cachedItem = sessionStorage.getItem(CACHE_KEY);
            if (cachedItem) {
                const { friends, allUsers, friendRequests, timestamp } = JSON.parse(cachedItem);
                if (Date.now() - timestamp < CACHE_EXPIRATION_MS) {
                    setFriends(friends);
                    setAllUsers(allUsers);
                    setFriendRequests(friendRequests);
                    setIsLoading(false);
                } else {
                     await refreshAllData(true);
                }
            } else {
                 await refreshAllData(true);
            }
        } catch (error) {
            console.error("Failed to read from sessionStorage:", error);
            await refreshAllData(true);
        }
    };

    loadData();
  }, [user, isUserLoading, refreshAllData]);

  // Effect to select friend based on URL
  useEffect(() => {
    const pathSegments = pathname.split('/');
    const friendId = pathSegments.length > 2 && pathSegments[2] === 'chat' ? pathSegments[3] : null;

    if (friendId && allUsers.length > 0) {
      if (!selectedFriend || selectedFriend.id !== friendId) {
        const friendToSelect = allUsers.find(u => u.id === friendId) || friends.find(f => f.friend_id === friendId)?.friend_profile;
        if (friendToSelect) {
            setSelectedFriend(friendToSelect);
        }
      }
    } else if (pathname === '/home') {
        setSelectedFriend(null);
    }
  }, [pathname, allUsers, friends, setSelectedFriend, selectedFriend]);


  useEffect(() => {
    if (!user) return;
    
    const realtimeChannel = supabase
      .channel('home-layout-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        () => {
            toast({
                title: 'Friends list updated!',
                description: 'Your connections have changed.',
                variant: 'info'
            });
            refreshAllData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        (payload) => {
            const oldRecord = payload.old as { receiver_id?: string; sender_id?: string };
            const newRecord = payload.new as { receiver_id?: string; sender_id?: string };

             if ((newRecord?.receiver_id === user.id || newRecord?.sender_id === user.id) || (oldRecord?.receiver_id === user.id || oldRecord?.sender_id === user.id)) {
                refreshAllData();
                if (payload.eventType === 'INSERT' && newRecord.receiver_id === user.id) {
                    const sender = allUsers.find(u => u.id === newRecord.sender_id);
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
           const newMessage = payload.new as { sender_id: string, content: string};
            if (newMessage.sender_id !== user.id && selectedFriend?.id === newMessage.sender_id) {
                // Already in chat, no toast needed, realtime message will appear
            } else if (newMessage.sender_id !== user.id) {
                const sender = allUsers.find(u => u.id === newMessage.sender_id);
                toast({
                    title: `New Message from ${sender?.display_name || 'a friend'}`,
                    description: newMessage.content,
                })
                setUnreadMessages(prev => new Set(prev).add(newMessage.sender_id));
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
    router.push('/home');
    refreshAllData().then(() => {
        setSelectedFriend(null);
    });
  },[router, refreshAllData, setSelectedFriend]);

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
      unreadMessages,
  };
  
  if (isLoading || isUserLoading) {
    return <LoadingScreen />;
  }

  return (
    <HomeClientContext.Provider value={value}>
        <CallProvider currentUser={currentUser}>
            {children}
        </CallProvider>
    </HomeClientContext.Provider>
  );
}
