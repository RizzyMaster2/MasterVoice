
'use client';

import type { UserProfile, Chat as AppChat } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { createChat, getChats, getUsers } from '@/app/(auth)/actions/chat';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { createClient } from '@/lib/supabase/client';

interface HomeClientLayoutProps {
    currentUser: UserProfile;
    initialChats: AppChat[];
    allUsers: UserProfile[];
}

export function HomeClientLayout({ currentUser, initialChats, allUsers }: HomeClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>(initialChats);
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const [isAddingFriend, startTransition] = useTransition();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const supabase = createClient();

  // Separate friends and groups
  const friends = useMemo(() => chats.filter(chat => !chat.is_group), [chats]);
  const friendContactIds = useMemo(() => {
    const ids = new Set<string>();
    friends.forEach(c => {
        c.participants.forEach(pId => ids.add(pId));
    });
    return ids;
  }, [friends]);

  useEffect(() => {
    setIsClient(true);
    if (friends.length > 0 && !selectedChat) {
      const sortedChats = [...friends].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSelectedChat(sortedChats[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for real-time chat creations and deletions
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-chats-for-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${currentUser.id}`,
        },
        async () => {
           // A new chat participant record was inserted, meaning we were added to a chat.
           // We always refresh the chat list to get the new data.
           const updatedChats = await refreshChats();
           // Find the new chat to show a toast
           const currentChatIds = new Set(chats.map(c => c.id));
           const newChat = updatedChats.find(c => !currentChatIds.has(c.id));

            if (newChat && !newChat.is_group) {
                 toast({
                    title: "New Friend!",
                    description: `${newChat.otherParticipant?.display_name} added you as a friend.`,
                    variant: 'success'
                });
            }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const deletedChatId = payload.old.chat_id;
          const removedChat = chats.find(c => c.id === deletedChatId);
          
          setChats(prev => prev.filter(c => c.id !== deletedChatId));

          if (selectedChat?.id === deletedChatId) {
            setSelectedChat(null);
          }
          
          if (removedChat && !removedChat.is_group && removedChat.otherParticipant) {
             toast({
                title: "Friend Removed",
                description: `${removedChat.otherParticipant.display_name} removed you as a friend.`,
                variant: "warning",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, currentUser.id, chats, selectedChat?.id]);


  const refreshChats = async () => {
    const updatedChats = await getChats();
    const friendChats = updatedChats.filter(c => !c.is_group);
    const users = await getUsers();
    
    const processedChats = friendChats.map(chat => {
        const otherId = chat.participants.find(pId => pId !== currentUser.id);
        if (otherId) {
            const otherUser = users.find(u => u.id === otherId);
            return { ...chat, otherParticipant: otherUser };
        }
        return null;
    }).filter(Boolean) as AppChat[];

    setChats(processedChats);
    return processedChats;
  };

  const handleAddFriend = (friend: UserProfile) => {
    startTransition(async () => {
      try {
        const { chat: newChat, isNew } = await createChat(friend.id);
        
        if (newChat) {
            if (isNew) {
                // Manually add the new chat to the state for an immediate UI update
                 const fullNewChat = { ...newChat, otherParticipant: friend };
                 setChats(prev => {
                    const updatedChats = [fullNewChat, ...prev];
                    return updatedChats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                });
                setSelectedChat(fullNewChat); // Immediately select the new chat
                toast({
                    title: "Friend Added",
                    description: `You can now chat with ${friend.display_name}.`,
                    variant: 'success'
                });
            } else {
                toast({
                    title: "Chat already exists",
                    description: "You already have a conversation with this user.",
                });
                // If the chat exists, find and select it from the current state
                const existingChat = chats.find(c => c.id === newChat.id);
                if(existingChat) {
                  setSelectedChat(existingChat)
                } else {
                  // If it doesn't exist in local state, refresh and select
                  const updatedChats = await refreshChats();
                  const chatToSelect = updatedChats.find(c => c.id === newChat.id);
                  if (chatToSelect) setSelectedChat(chatToSelect);
                }
            }
        }
      } catch (error) {
          console.error("Failed to create chat:", error);
          toast({
              title: "Failed to Add Friend",
              description: error instanceof Error ? error.message : "An unknown error occurred.",
              variant: "destructive",
          });
      }
    });
  };

  const handleGroupCreated = async () => {
    // No need to switch view, just refresh chats in the background. 
    // The user will navigate to the groups page to see it.
    await refreshChats();
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
            <SuggestedFriends
                currentUser={currentUser}
                allUsers={allUsers}
                onAddFriend={handleAddFriend}
                contactIds={friendContactIds}
                onGroupCreated={handleGroupCreated}
                isAddingFriend={isAddingFriend}
            />
        </div>
    </div>
  );
}

    
