
'use client';

import type { UserProfile, Chat as AppChat } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { createChat, getChats } from '@/app/(auth)/actions/chat';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

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

  useEffect(() => {
    setIsClient(true);
    if (initialChats.length > 0 && !selectedChat) {
      // Find the most recent chat to select initially
      const sortedChats = [...initialChats].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSelectedChat(sortedChats[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChats]);

  const refreshChats = async () => {
    const updatedChats = await getChats();
    setChats(updatedChats);
    return updatedChats;
  };

  const handleAddFriend = (friend: UserProfile) => {
    startTransition(async () => {
      try {
        const { chat: newChat, isNew } = await createChat(friend.id);
        
        if (newChat) {
            if (isNew) {
                // Manually add the new chat to the state for an immediate UI update
                setChats(prev => {
                    const updatedChats = [newChat, ...prev];
                    return updatedChats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                });
                setSelectedChat(newChat); // Immediately select the new chat
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
                  // If it doesn't exist in local state for some reason, refresh and select
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

  const contactIds = useMemo(() => {
    const ids = new Set<string>();
    chats.forEach(c => {
        if (!c.is_group) {
            c.participants.forEach(pId => ids.add(pId));
        }
    });
    return ids;
  }, [chats]);

  const handleGroupCreated = async () => {
    const updatedChats = await refreshChats();
     if (updatedChats.length > 0) {
      // Find the most recent chat (the one just created) and select it
      const sortedChats = [...updatedChats].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSelectedChat(sortedChats[0]);
    }
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
                chats={chats} 
                setChats={setChats} 
                allUsers={allUsers}
                selectedChat={selectedChat}
                setSelectedChat={setSelectedChat}
            />
        </div>
        <div className="w-full lg:w-[320px] flex flex-col gap-6">
            <SuggestedFriends
                currentUser={currentUser}
                allUsers={allUsers}
                onAddFriend={handleAddFriend}
                contactIds={contactIds}
                onGroupCreated={handleGroupCreated}
                isAddingFriend={isAddingFriend}
            />
        </div>
    </div>
  );
}
