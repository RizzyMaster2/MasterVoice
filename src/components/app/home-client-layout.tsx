
'use client';

import type { UserProfile, Chat as AppChat, FriendRequest } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { getChats, sendFriendRequest, getFriendRequests, cancelFriendRequest, acceptFriendRequest, declineFriendRequest } from '@/app/(auth)/actions/chat';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { FriendRequests } from './friend-requests';

interface HomeClientLayoutProps {
    currentUser: UserProfile;
    initialChats: AppChat[];
    initialFriendRequests: { incoming: FriendRequest[], outgoing: FriendRequest[] };
    allUsers: UserProfile[];
}

// Helper to extract a user-friendly error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    try {
      // Supabase can sometimes stringify a JSON object in the message
      const parsed = JSON.parse(error.message);
      return parsed.message || error.message;
    } catch (e) {
      return error.message;
    }
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred.';
};


export function HomeClientLayout({ currentUser, initialChats, initialFriendRequests, allUsers }: HomeClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>(initialChats);
  const [friendRequests, setFriendRequests] = useState(initialFriendRequests);
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const [isProcessing, startTransition] = useTransition();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const supabase = createClient();

  const friends = useMemo(() => chats.filter(chat => !chat.is_group), [chats]);
  const friendContactIds = useMemo(() => {
    const ids = new Set<string>();
    friends.forEach(c => {
        c.participants.forEach(pId => ids.add(pId));
    });
    return ids;
  }, [friends]);

  const outgoingRequestUserIds = useMemo(() => new Set(friendRequests.outgoing.map(req => req.to_user_id)), [friendRequests.outgoing]);


  useEffect(() => {
    setIsClient(true);
    if (friends.length > 0 && !selectedChat) {
      const sortedChats = [...friends].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSelectedChat(sortedChats[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const handleNewFriendRequest = (payload: any) => {
        const newRequest = payload.new;
        // Check if it's an incoming request and add profile info
        if (newRequest.to_user_id === currentUser.id) {
            const fromUser = allUsers.find(u => u.id === newRequest.from_user_id);
            if (fromUser) {
                setFriendRequests(prev => ({
                    ...prev,
                    incoming: [...prev.incoming, { ...newRequest, profiles: fromUser }]
                }));
                 toast({
                    title: "New Friend Request",
                    description: `You received a friend request from ${fromUser.display_name}.`,
                    variant: 'info'
                });
            }
        } else if (newRequest.from_user_id === currentUser.id) {
            const toUser = allUsers.find(u => u.id === newRequest.to_user_id);
            if(toUser){
                // It's an outgoing request we just sent
                setFriendRequests(prev => ({
                    ...prev,
                    outgoing: [...prev.outgoing, { ...newRequest, profiles: toUser }]
                }));
            }
        }
    };
    
    const handleRequestUpdate = (payload: any) => {
        const updatedRequest = payload.new;
        if(updatedRequest.status === 'accepted' && updatedRequest.from_user_id === currentUser.id) {
            const toUser = allUsers.find(u => u.id === updatedRequest.to_user_id);
            toast({
                title: "Friend Request Accepted",
                description: `${toUser?.display_name || 'A user'} accepted your friend request.`,
                variant: 'success'
            });
            refreshAllData();
        } else if (updatedRequest.status === 'declined' && updatedRequest.from_user_id === currentUser.id) {
             const toUser = allUsers.find(u => u.id === updatedRequest.to_user_id);
             toast({
                title: "Friend Request Declined",
                description: `${toUser?.display_name || 'A user'} declined your friend request.`,
                variant: 'destructive'
            });
            refreshAllData();
        } else if (updatedRequest.status === 'accepted' && updatedRequest.to_user_id === currentUser.id) {
            // This is when WE accept a request, the UI is already handled optimistically, just need to refresh the request list.
            refreshAllData();
        }
    }

    const handleRequestDelete = (payload: any) => {
         const deletedRequest = payload.old;
         if (!deletedRequest) return;
         
         if (deletedRequest.to_user_id === currentUser.id) {
              setFriendRequests(prev => ({ ...prev, incoming: prev.incoming.filter(r => r.id !== deletedRequest.id) }));
         }
         if (deletedRequest.from_user_id === currentUser.id) {
             setFriendRequests(prev => ({ ...prev, outgoing: prev.outgoing.filter(r => r.id !== deletedRequest.id) }));
         }
    };


    const friendRequestChannel = supabase.channel(`friend-requests-${currentUser.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests' }, handleNewFriendRequest)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friend_requests' }, handleRequestUpdate)
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'friend_requests' }, handleRequestDelete)
        .subscribe();

     const chatChannel = supabase
      .channel(`realtime-chats-for-${currentUser.id}`)
      .on( 'postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${currentUser.id}`, },
        (payload) => {
            const newChatId = payload.new.chat_id;
            const isExisting = chats.some(c => c.id === newChatId);
            if (!isExisting) {
                toast({
                    title: "New Friend",
                    description: "Someone added you as a friend!",
                    variant: 'info'
                });
                refreshAllData();
            }
        }
      )
      .on( 'postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${currentUser.id}`, },
        (payload) => {
            const deletedChatId = payload.old.chat_id;
            const removedChat = chats.find(c => c.id === deletedChatId);
            setChats(prev => prev.filter(c => c.id !== deletedChatId));
            if (selectedChat?.id === deletedChatId) setSelectedChat(null);
            
            if (removedChat) {
                toast({
                    title: "Friend Removed",
                    description: `You are no longer friends with ${removedChat.otherParticipant?.display_name || 'a user'}.`,
                    variant: 'info'
                });
            }
        }
      )
      .subscribe();


    return () => {
      supabase.removeChannel(friendRequestChannel);
      supabase.removeChannel(chatChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, supabase, allUsers, chats]);

  const refreshAllData = async () => {
    const [chats, requests] = await Promise.all([getChats(), getFriendRequests()]);
    setChats(chats);
    setFriendRequests(requests);
    return { chats, requests };
  };
  
  const handleSendFriendRequest = (friend: UserProfile) => {
    startTransition(async () => {
      try {
        await sendFriendRequest(friend.id);
        toast({
          title: "Request Sent",
          description: `Your friend request to ${friend.display_name} has been sent.`,
          variant: 'success'
        });
        // We don't need to manually update state here because the realtime listener `handleNewFriendRequest` will do it.
      } catch (error) {
        toast({
          title: "Error",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    });
  };

  const handleRequestResponse = (action: 'accept' | 'decline' | 'cancel', request: FriendRequest) => {
    startTransition(async () => {
        try {
            let user, title, description, variant;
            switch(action) {
                case 'accept':
                    const newChat = await acceptFriendRequest(request.id);
                    user = request.profiles;
                    title = "Request Accepted";
                    description = `You are now friends with ${user?.display_name}.`;
                    variant = 'success';
                    // Optimistically add the new chat, or just refresh
                    if (newChat) {
                        setChats(prev => [newChat, ...prev]);
                        setSelectedChat(newChat);
                    } else {
                        // The realtime listener will catch this, but a manual refresh is a good fallback
                        await refreshAllData();
                    }
                    break;
                case 'decline':
                    await declineFriendRequest(request.id);
                    user = request.profiles;
                    title = "Request Declined";
                    description = `You have declined the friend request from ${user?.display_name}.`;
                    variant = 'info';
                    break;
                case 'cancel':
                    await cancelFriendRequest(request.id);
                    user = request.profiles;
                    title = "Request Cancelled";
                    description = `You have cancelled your friend request to ${user?.display_name}.`;
                    variant = 'info';
                    break;
            }
             toast({ title, description, variant });
             // Realtime listeners will remove the request from the UI
        } catch (error) {
             toast({
                title: 'Error',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    })
  };


  const handleGroupCreated = async () => {
    await refreshAllData();
    toast({
        title: "Group Created",
        description: "You can view your new group on the Groups page.",
        variant: "success",
    });
  }

  if (!isClient) {
    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
            <Skeleton className="flex-1 h-full" />
            <div className="w-full lg:w-[320px] flex flex-col gap-6">
                <Skeleton className="w-full h-64" />
                <Skeleton className="w-full h-96" />
            </div>
        </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
        <div className="flex-1 h-full">
            <ChatLayout 
                currentUser={currentUser} 
                chats={friends}
                setChats={setChats}
                allUsers={allUsers}
                selectedChat={selectedChat}
                setSelectedChat={setSelectedChat}
                listType="friend"
            />
        </div>
        <div className="w-full lg:w-[320px] flex flex-col gap-6">
            <FriendRequests
                requests={friendRequests}
                onRespond={handleRequestResponse}
                isProcessing={isProcessing}
            />
            <SuggestedFriends
                currentUser={currentUser}
                allUsers={allUsers}
                onAddFriend={handleSendFriendRequest}
                contactIds={friendContactIds}
                outgoingRequestUserIds={outgoingRequestUserIds}
                onGroupCreated={handleGroupCreated}
                isProcessing={isProcessing}
            />
        </div>
    </div>
  );
}
