
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
import { CallProvider, useCall } from './call-provider';

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

function Debugger() {
    const router = useRouter();
    const { friends } = useHomeClient();
    const { incomingCall, acceptCall, endCall } = useCall();
    
    useEffect(() => {
        const masterVoiceDebug = {
            log: () => console.log({ friends, incomingCall }),
            joinCall: (friendId?: string) => {
                if (incomingCall) {
                    console.log(`Accepting incoming call from ${incomingCall.callerProfile.display_name}...`);
                    acceptCall();
                    return;
                }
                
                const friend = friends.find(f => f.friend_id === friendId || f.friend_profile.display_name === friendId);
                if (friend) {
                    console.log(`Initiating call with ${friend.friend_profile.display_name}...`);
                    router.push(`/home/chat/${friend.friend_id}/call`);
                } else if (friendId) {
                    console.error(`Friend with ID or name "${friendId}" not found.`);
                    console.log("Available friends:", friends.map(f => ({ name: f.friend_profile.display_name, id: f.friend_id })));
                } else {
                     console.error("No friendId provided and no incoming call to accept.");
                }
            },
            endCall: () => {
                console.log("Attempting to end call from debug console...");
                if (endCall) {
                    endCall();
                } else {
                    console.log("endCall function not available.");
                }
            }
        };

        (window as any).masterVoiceDebug = masterVoiceDebug;
        
        console.log("%cMasterVoice Debug Tools Loaded", "color: #0ea5e9; font-weight: bold; font-size: 14px;");
        console.log("You can now use `masterVoiceDebug` in the console.");
        console.log(" - `masterVoiceDebug.joinCall('friend-id-or-name')` to start a call.");
        console.log(" - `masterVoiceDebug.joinCall()` to accept an incoming call.");
        console.log(" - `masterVoiceDebug.endCall()` to hang up.");

        return () => {
            delete (window as any).masterVoiceDebug;
        };
    }, [router, friends, incomingCall, acceptCall, endCall]);

    return null;
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
        if (isUserLoading || !user) {
            setIsLoading(false);
            return;
        }

        try {
            // Use initial data immediately, making the initial load feel instant
            if (initialFriends.length > 0 || initialUsers.length > 0 || initialFriendRequests.incoming.length > 0) {
                 setIsLoading(false);
            }

            const cachedItem = sessionStorage.getItem(CACHE_KEY);
            if (cachedItem) {
                const { friends, allUsers, friendRequests, timestamp } = JSON.parse(cachedItem);
                if (Date.now() - timestamp < CACHE_EXPIRATION_MS) {
                    setFriends(friends);
                    setAllUsers(allUsers);
                    setFriendRequests(friendRequests);
                    setIsLoading(false); // Stop loading if valid cache found
                } else {
                     await refreshAllData(true); // Refresh if cache is stale
                }
            } else {
                 if (isLoading) await refreshAllData(true); // Only full load if we're still in a loading state
            }
        } catch (error) {
            console.error("Failed to read from sessionStorage:", error);
            if (isLoading) await refreshAllData(true);
        }
    };

    loadData();
  }, [user, isUserLoading, refreshAllData, isLoading, initialFriends, initialUsers, initialFriendRequests]);

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
      .channel('public-db-changes')
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
          if (status === 'CHANNEL_ERROR' || err) {
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
            <Debugger />
        </CallProvider>
    </HomeClientContext.Provider>
  );
}
